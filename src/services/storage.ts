import type {
  AppStorageShape,
  LearningRecord,
  MasteredWord,
  Settings,
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
  masteredWords: [],
  learningHistory: [],
  settings: DEFAULT_SETTINGS,
  version: 1,
};

function deepMerge(base: AppStorageShape, raw: any): AppStorageShape {
  return {
    wrongWords: Array.isArray(raw?.wrongWords) ? raw.wrongWords : base.wrongWords,
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
