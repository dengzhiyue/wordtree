import type {
  AppStorageShape,
  LearningRecord,
  MasteredWord,
  Settings,
  WordBankRecord,
  WordBook,
  WrongWordRecord,
} from '@/types';

const KEY = 'recurwords.storage.v1';

export const DEFAULT_SETTINGS: Settings = {
  dataSource: 'oxford_api_preferred',
  oxfordAppId: '',
  oxfordAppKey: '',
  oxfordProxyBase: '',
  llmApiKey: '',
  llmModel: 'deepseek-chat',
  llmBaseUrl: 'https://api.deepseek.com/v1',
  targetCorrect: 3,
  theme: 'system',
};

const DEFAULT_STORAGE: AppStorageShape = {
  wrongWords: [],
  wordBank: [],
  wordBooks: [],
  masteredWords: [],
  learningHistory: [],
  settings: DEFAULT_SETTINGS,
  version: 1,
};

/** 将旧版 wrongWords 迁移为新版 wordBank 记录 */
function migrateWrongWords(old: WrongWordRecord[]): WordBankRecord[] {
  return old.map((w) => ({
    word: w.word,
    correctAnswers: w.correctAnswers,
    wrongCount: w.wrongCount,
    consecutiveCorrect: w.consecutiveCorrect,
    targetCorrect: w.targetCorrect,
    firstAddedTime: w.firstWrongTime,
    lastWrongTime: w.lastWrongTime,
    lastReviewTime: w.lastReviewTime,
    userWrongAnswers: w.userWrongAnswers,
    isWrong: true,
  }));
}

function deepMerge(base: AppStorageShape, raw: any): AppStorageShape {
  // 优先使用新版 wordBank；如果没有，尝试从旧版 wrongWords 迁移
  const wordBank: WordBankRecord[] = Array.isArray(raw?.wordBank)
    ? raw.wordBank
    : Array.isArray(raw?.wrongWords)
      ? migrateWrongWords(raw.wrongWords)
      : base.wordBank;

  return {
    wrongWords: Array.isArray(raw?.wrongWords) ? raw.wrongWords : base.wrongWords,
    wordBank,
    wordBooks: Array.isArray(raw?.wordBooks) ? raw.wordBooks : base.wordBooks,
    masteredWords: Array.isArray(raw?.masteredWords) ? raw.masteredWords : base.masteredWords,
    learningHistory: Array.isArray(raw?.learningHistory)
      ? raw.learningHistory
      : base.learningHistory,
    settings: { ...base.settings, ...(raw?.settings || {}) },
    version: typeof raw?.version === 'number' ? raw.version : base.version,
  };
}

export class Storage {
  static read(): AppStorageShape {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) {
        Storage.write(DEFAULT_STORAGE);
        return DEFAULT_STORAGE;
      }
      const parsed = JSON.parse(raw);
      const merged = deepMerge(DEFAULT_STORAGE, parsed);
      if (JSON.stringify(parsed) !== JSON.stringify(merged)) Storage.write(merged);
      return merged;
    } catch {
      return { ...DEFAULT_STORAGE };
    }
  }

  static write(v: AppStorageShape): void {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(v));
    } catch (e) {
      console.error('[Storage] Quota exceeded:', e);
      throw e;
    }
  }

  static get<K extends keyof AppStorageShape>(k: K): AppStorageShape[K] {
    return Storage.read()[k];
  }

  static set<K extends keyof AppStorageShape>(k: K, v: AppStorageShape[K]): void {
    const all = Storage.read();
    (all as any)[k] = v;
    Storage.write(all);
  }

  static resetAll(): void {
    window.localStorage.removeItem(KEY);
    Storage.write(DEFAULT_STORAGE);
  }

  static ensureInitialized(): AppStorageShape {
    return Storage.read();
  }

  static getSettings(): Settings {
    return Storage.read().settings;
  }
  static saveSettings(s: Settings) {
    Storage.set('settings', s);
  }
  static getWrongWords(): WrongWordRecord[] {
    return Storage.read().wrongWords;
  }
  static saveWrongWords(v: WrongWordRecord[]) {
    Storage.set('wrongWords', v);
  }
  static getWordBank(): WordBankRecord[] {
    return Storage.read().wordBank;
  }
  static saveWordBank(v: WordBankRecord[]) {
    Storage.set('wordBank', v);
  }
  static getWordBooks(): WordBook[] {
    return Storage.read().wordBooks;
  }
  static saveWordBooks(v: WordBook[]) {
    Storage.set('wordBooks', v);
  }
  static getMasteredWords(): MasteredWord[] {
    return Storage.read().masteredWords;
  }
  static saveMasteredWords(v: MasteredWord[]) {
    Storage.set('masteredWords', v);
  }
  static getLearningHistory(): LearningRecord[] {
    return Storage.read().learningHistory;
  }
  static saveLearningHistory(v: LearningRecord[]) {
    Storage.set('learningHistory', v);
  }
}
