import { create } from 'zustand';
import { Storage, DEFAULT_SETTINGS } from '@/services/storage';
import { fetchWord } from '@/services/wordFetcher';
import { judgeMatch } from '@/services/semanticJudge';
import type {
  LearningRecord,
  LookupPhase,
  MasteredWord,
  ReviewSession,
  SelfTestState,
  Settings,
  WordNode,
  WrongWordRecord,
} from '@/types';
import { uid } from '@/utils/text';

type S = {
  // ---------- settings ----------
  settings: Settings;
  learningHistory: LearningRecord[];
  setSettings: (p: Partial<Settings>) => void;
  resetSettings: () => void;

  // ---------- word tree ----------
  phase: LookupPhase;
  rootWord: string | null;
  rootNode: WordNode | null;
  focusNodeId: string | null;
  errorMsg: string | null;
  selfTest: SelfTestState | null;
  lastMasteredFlag: boolean;
  startLookup: (w: string) => Promise<void>;
  expandChild: (parentId: string, word: string) => Promise<void>;
  collapseChild: (nodeId: string) => void;
  setFocus: (id: string | null) => void;
  collapseAllButRoot: () => void;
  enterTest: () => void;
  setUserAnswer: (v: string) => void;
  checkAnswer: () => Promise<void>;
  resetTree: () => void;

  // ---------- wrong bank ----------
  wrongWords: WrongWordRecord[];
  masteredWords: MasteredWord[];
  removeFromWrongBank: (word: string) => void;
  deleteRecord: (word: string) => void;
  batchDelete: (words: string[]) => void;
  batchRemove: (words: string[]) => void;
  recordResult: (p: {
    word: string;
    correctAnswers: string[];
    userAnswer: string;
    isCorrect: boolean;
    targetCorrect: number;
  }) => { masteredThisRound: boolean };
  buildReviewQueue: (limit?: number) => WrongWordRecord[];

  // ---------- review session ----------
  reviewSession: ReviewSession;
  startReview: (queue: WrongWordRecord[]) => void;
  advanceReview: () => void;
  closeReview: () => void;
};

function applyThemeDOM(theme: Settings['theme']) {
  const root = document.documentElement;
  const wantDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', !!wantDark);
}

function mapTree(root: WordNode, cb: (n: WordNode) => WordNode): WordNode {
  const next = cb(root);
  return { ...next, children: next.children.map((c) => mapTree(c, cb)) };
}

function findNode(root: WordNode | null, id: string): WordNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  for (const c of root.children) {
    const r = findNode(c, id);
    if (r) return r;
  }
  return null;
}

function updateNode(root: WordNode, id: string, updater: (n: WordNode) => WordNode): WordNode {
  return mapTree(root, (n) => (n.id === id ? updater(n) : n));
}

export const useAppStore = create<S>((set, get) => {
  const initial = Storage.ensureInitialized();
  applyThemeDOM(initial.settings.theme);
  const query = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (query && typeof query.addEventListener === 'function') {
    query.addEventListener('change', () => {
      if (get().settings.theme === 'system') applyThemeDOM('system');
    });
  }

  return {
    // ---------- settings ----------
    settings: initial.settings,
    learningHistory: initial.learningHistory,
    setSettings: (p) => {
      const next = { ...get().settings, ...p };
      Storage.saveSettings(next);
      if (p.theme) applyThemeDOM(next.theme);
      set({ settings: next });
    },
    resetSettings: () => {
      const s = { ...DEFAULT_SETTINGS };
      Storage.saveSettings(s);
      applyThemeDOM(s.theme);
      set({ settings: s });
    },

    // ---------- tree ----------
    phase: 'idle',
    rootWord: null,
    rootNode: null,
    focusNodeId: null,
    errorMsg: null,
    selfTest: null,
    lastMasteredFlag: false,

    startLookup: async (wRaw) => {
      const w = wRaw.trim().toLowerCase();
      if (!w) return;
      set({ phase: 'loading', errorMsg: null, selfTest: null, rootWord: w, lastMasteredFlag: false });
      try {
        const res = await fetchWord(w, get().settings);
        const root: WordNode = {
          id: `root-${uid()}`,
          word: w,
          englishDefinition: res.englishDefinition,
          chineseMeanings: res.chineseMeanings,
          children: [],
          expanded: true,
          depth: 0,
          parentId: null,
          source: res.source,
        };
        set({ phase: 'browsing', rootNode: root, focusNodeId: root.id });
      } catch (e) {
        set({
          phase: 'idle',
          errorMsg: (e as Error).message || '查询失败，请稍后重试。',
        });
      }
    },

    expandChild: async (parentId, word) => {
      const { rootNode, settings } = get();
      const parent = findNode(rootNode, parentId);
      if (!parent) return;
      const existing = parent.children.find(
        (c) => c.word.toLowerCase() === word.toLowerCase(),
      );
      if (existing) {
        set({
          rootNode: updateNode(rootNode!, existing.id, (n) => ({ ...n, expanded: true })),
          focusNodeId: existing.id,
        });
        return;
      }
      try {
        const res = await fetchWord(word, settings);
        const newNode: WordNode = {
          id: `n-${uid()}`,
          word,
          englishDefinition: res.englishDefinition,
          chineseMeanings: res.chineseMeanings,
          children: [],
          expanded: true,
          depth: parent.depth + 1,
          parentId: parent.id,
          source: res.source,
        };
        const nextRoot = updateNode(rootNode!, parentId, (n) => ({
          ...n,
          children: [...n.children, newNode],
        }));
        set({ rootNode: nextRoot, focusNodeId: newNode.id });
      } catch (e) {
        set({ errorMsg: (e as Error).message || '获取子释义失败。' });
      }
    },

    collapseChild: (nodeId) => {
      const r = get().rootNode;
      if (!r) return;
      set({
        rootNode: updateNode(r, nodeId, (n) => ({ ...n, expanded: false, children: [] })),
      });
    },

    setFocus: (id) => set({ focusNodeId: id }),

    collapseAllButRoot: () => {
      const r = get().rootNode;
      if (!r) return;
      const next = updateNode(r, r.id, (n) => ({
        ...n,
        expanded: true,
        children: n.children.map((c) => mapTree(c, (x) => ({ ...x, expanded: false, children: [] }))),
      }));
      set({ rootNode: next, focusNodeId: next.id });
    },

    enterTest: () => {
      const r = get().rootNode;
      if (!r) return;
      get().collapseAllButRoot();
      set({
        phase: 'testing',
        selfTest: {
          word: r.word,
          userAnswer: '',
          isCorrect: null,
          correctAnswers: r.chineseMeanings,
        },
      });
    },

    setUserAnswer: (v) => {
      const st = get().selfTest;
      if (!st) return;
      set({ selfTest: { ...st, userAnswer: v } });
    },

    checkAnswer: async () => {
      const st = get().selfTest;
      if (!st || !st.userAnswer.trim()) return;
      const settings = get().settings;
      const { ok } = await judgeMatch({
        word: st.word,
        userAnswer: st.userAnswer,
        correctAnswers: st.correctAnswers,
        settings,
      });
      const { masteredThisRound } = get().recordResult({
        word: st.word,
        correctAnswers: st.correctAnswers,
        userAnswer: st.userAnswer,
        isCorrect: ok,
        targetCorrect: settings.targetCorrect,
      });
      set({
        phase: 'result',
        selfTest: { ...st, isCorrect: ok },
        lastMasteredFlag: masteredThisRound,
      });
    },

    resetTree: () =>
      set({
        phase: 'idle',
        rootWord: null,
        rootNode: null,
        focusNodeId: null,
        selfTest: null,
        errorMsg: null,
        lastMasteredFlag: false,
      }),

    // ---------- wrong bank ----------
    wrongWords: initial.wrongWords,
    masteredWords: initial.masteredWords,

    removeFromWrongBank: (word) => {
      const list = get().wrongWords.filter((w) => w.word !== word);
      Storage.saveWrongWords(list);
      const masterList = [
        ...get().masteredWords.filter((m) => m.word !== word),
        { word, masteredTime: Date.now(), fromWrongBank: true },
      ];
      Storage.saveMasteredWords(masterList);
      set({ wrongWords: list, masteredWords: masterList });
    },

    deleteRecord: (word) => {
      const list = get().wrongWords.filter((w) => w.word !== word);
      Storage.saveWrongWords(list);
      set({ wrongWords: list });
    },
    batchDelete: (words) => {
      const s = new Set(words);
      const list = get().wrongWords.filter((w) => !s.has(w.word));
      Storage.saveWrongWords(list);
      set({ wrongWords: list });
    },
    batchRemove: (words) => {
      const s = new Set(words);
      const list = get().wrongWords.filter((w) => !s.has(w.word));
      Storage.saveWrongWords(list);
      const add = words
        .filter((w) => !get().masteredWords.find((m) => m.word === w))
        .map((word) => ({ word, masteredTime: Date.now(), fromWrongBank: true }));
      const mList = [...get().masteredWords, ...add];
      Storage.saveMasteredWords(mList);
      set({ wrongWords: list, masteredWords: mList });
    },

    recordResult: ({ word, correctAnswers, userAnswer, isCorrect, targetCorrect }) => {
      const hist = [
        ...get().learningHistory,
        { word, timestamp: Date.now(), isCorrect, userAnswer, correctAnswers },
      ];
      Storage.saveLearningHistory(hist);

      let masteredThisRound = false;
      const wrongList = [...get().wrongWords];
      const idx = wrongList.findIndex((w) => w.word === word);
      if (!isCorrect) {
        const now = Date.now();
        if (idx >= 0) {
          wrongList[idx] = {
            ...wrongList[idx],
            wrongCount: wrongList[idx].wrongCount + 1,
            consecutiveCorrect: 0,
            lastWrongTime: now,
            lastReviewTime: now,
            correctAnswers: correctAnswers.length ? correctAnswers : wrongList[idx].correctAnswers,
            userWrongAnswers: [...wrongList[idx].userWrongAnswers, userAnswer].slice(-20),
          };
        } else {
          wrongList.push({
            word,
            correctAnswers,
            wrongCount: 1,
            consecutiveCorrect: 0,
            targetCorrect,
            firstWrongTime: now,
            lastWrongTime: now,
            lastReviewTime: now,
            userWrongAnswers: userAnswer ? [userAnswer] : [],
          });
        }
        Storage.saveWrongWords(wrongList);
        set({ wrongWords: wrongList, learningHistory: hist });
      } else {
        if (idx >= 0) {
          const r = wrongList[idx];
          const next = {
            ...r,
            consecutiveCorrect: r.consecutiveCorrect + 1,
            lastReviewTime: Date.now(),
          };
          if (next.consecutiveCorrect >= next.targetCorrect) {
            wrongList.splice(idx, 1);
            const mList = [
              ...get().masteredWords.filter((m) => m.word !== word),
              { word, masteredTime: Date.now(), fromWrongBank: true },
            ];
            Storage.saveMasteredWords(mList);
            masteredThisRound = true;
            Storage.saveWrongWords(wrongList);
            set({ wrongWords: wrongList, masteredWords: mList, learningHistory: hist });
          } else {
            wrongList[idx] = next;
            Storage.saveWrongWords(wrongList);
            set({ wrongWords: wrongList, learningHistory: hist });
          }
        } else {
          const exists = get().masteredWords.find((m) => m.word === word);
          if (!exists) {
            const mList = [
              ...get().masteredWords,
              { word, masteredTime: Date.now(), fromWrongBank: false },
            ];
            Storage.saveMasteredWords(mList);
            set({ masteredWords: mList, learningHistory: hist });
          } else {
            set({ learningHistory: hist });
          }
        }
      }
      return { masteredThisRound };
    },

    buildReviewQueue: (limit = 50) => {
      const list = get().wrongWords;
      const maxCount = Math.max(1, ...list.map((w) => w.wrongCount));
      const DAY = 24 * 3600 * 1000;
      const scored = list.map((w) => {
        const s1 = w.wrongCount / maxCount;
        const days = (Date.now() - w.lastWrongTime) / DAY;
        const s2 = Math.min(1, days / 7);
        const s3 = 1 - w.consecutiveCorrect / Math.max(1, w.targetCorrect);
        return { w, score: s1 * 0.5 + s2 * 0.3 + s3 * 0.2 };
      });
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map((x) => x.w);
    },

    // ---------- review session ----------
    reviewSession: null,
    startReview: (queue) => set({ reviewSession: { queue, index: 0 } }),
    advanceReview: () => {
      const s = get().reviewSession;
      if (!s) return;
      if (s.index + 1 >= s.queue.length)
        set({ reviewSession: { ...s, index: s.queue.length } });
      else set({ reviewSession: { ...s, index: s.index + 1 } });
    },
    closeReview: () => set({ reviewSession: null }),
  };
});

export function takeLastMasteredFlag(): boolean {
  const v = useAppStore.getState().lastMasteredFlag;
  useAppStore.setState({ lastMasteredFlag: false });
  return v;
}
