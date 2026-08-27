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
  WordBankRecord,
  WordBook,
  WordBookTreeNode,
  WordNode,
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

  // ---------- word bank ----------
  wordBank: WordBankRecord[];
  masteredWords: MasteredWord[];
  addToWordBank: (word: string, correctAnswers: string[]) => void;
  removeFromWordBank: (word: string) => void;
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
  guessExampleWord: (p: {
    word: string;
    correctAnswers: string[];
    userAnswer: string;
    targetCorrect: number;
  }) => Promise<{ isCorrect: boolean; degraded: boolean }>;
  buildReviewQueue: (limit?: number) => WordBankRecord[];

  // ---------- review session ----------
  reviewSession: ReviewSession;
  startReview: (queue: WordBankRecord[]) => void;
  advanceReview: () => void;
  closeReview: () => void;

  // ---------- word books ----------
  wordBooks: WordBook[];
  expandedDescendantCount: () => number;
  generateWordBook: () => WordBook | null;
  deleteWordBook: (id: string) => void;
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
        // 查过的词自动入单词库
        get().addToWordBank(w, res.chineseMeanings);
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
        // 例句点击展开的词也入单词库
        get().addToWordBank(word, res.chineseMeanings);
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

    // ---------- word bank ----------
    wordBank: initial.wordBank,
    masteredWords: initial.masteredWords,

    addToWordBank: (word, correctAnswers) => {
      const list = [...get().wordBank];
      const idx = list.findIndex((w) => w.word === word);
      if (idx >= 0) {
        // 已在库中，更新 correctAnswers（如果有新的）
        if (correctAnswers.length && !list[idx].correctAnswers.length) {
          list[idx] = { ...list[idx], correctAnswers };
          Storage.saveWordBank(list);
          set({ wordBank: list });
        }
      } else {
        list.push({
          word,
          correctAnswers,
          wrongCount: 0,
          consecutiveCorrect: 0,
          targetCorrect: get().settings.targetCorrect,
          firstAddedTime: Date.now(),
          lastWrongTime: 0,
          lastReviewTime: 0,
          userWrongAnswers: [],
          isWrong: false,
        });
        Storage.saveWordBank(list);
        set({ wordBank: list });
      }
    },

    removeFromWordBank: (word) => {
      const list = get().wordBank.filter((w) => w.word !== word);
      Storage.saveWordBank(list);
      const masterList = [
        ...get().masteredWords.filter((m) => m.word !== word),
        { word, masteredTime: Date.now(), fromWrongBank: true },
      ];
      Storage.saveMasteredWords(masterList);
      set({ wordBank: list, masteredWords: masterList });
    },

    deleteRecord: (word) => {
      const list = get().wordBank.filter((w) => w.word !== word);
      Storage.saveWordBank(list);
      set({ wordBank: list });
    },
    batchDelete: (words) => {
      const s = new Set(words);
      const list = get().wordBank.filter((w) => !s.has(w.word));
      Storage.saveWordBank(list);
      set({ wordBank: list });
    },
    batchRemove: (words) => {
      const s = new Set(words);
      const list = get().wordBank.filter((w) => !s.has(w.word));
      Storage.saveWordBank(list);
      const add = words
        .filter((w) => !get().masteredWords.find((m) => m.word === w))
        .map((word) => ({ word, masteredTime: Date.now(), fromWrongBank: true }));
      const mList = [...get().masteredWords, ...add];
      Storage.saveMasteredWords(mList);
      set({ wordBank: list, masteredWords: mList });
    },

    recordResult: ({ word, correctAnswers, userAnswer, isCorrect, targetCorrect }) => {
      const hist = [
        ...get().learningHistory,
        { word, timestamp: Date.now(), isCorrect, userAnswer, correctAnswers },
      ];
      Storage.saveLearningHistory(hist);

      // 确保词在单词库中
      get().addToWordBank(word, correctAnswers);

      let masteredThisRound = false;
      const list = [...get().wordBank];
      const idx = list.findIndex((w) => w.word === word);
      if (idx < 0) return { masteredThisRound };

      const now = Date.now();
      if (!isCorrect) {
        list[idx] = {
          ...list[idx],
          isWrong: true,
          wrongCount: list[idx].wrongCount + 1,
          consecutiveCorrect: 0,
          lastWrongTime: now,
          lastReviewTime: now,
          correctAnswers: correctAnswers.length ? correctAnswers : list[idx].correctAnswers,
          userWrongAnswers: [...list[idx].userWrongAnswers, userAnswer].slice(-20),
        };
        Storage.saveWordBank(list);
        set({ wordBank: list, learningHistory: hist });
      } else {
        const r = list[idx];
        const next = {
          ...r,
          consecutiveCorrect: r.consecutiveCorrect + 1,
          lastReviewTime: now,
        };
        if (next.isWrong && next.consecutiveCorrect >= next.targetCorrect) {
          // 从单词库移除（已掌握）
          list.splice(idx, 1);
          const mList = [
            ...get().masteredWords.filter((m) => m.word !== word),
            { word, masteredTime: now, fromWrongBank: true },
          ];
          Storage.saveMasteredWords(mList);
          masteredThisRound = true;
          Storage.saveWordBank(list);
          set({ wordBank: list, masteredWords: mList, learningHistory: hist });
        } else {
          list[idx] = next;
          Storage.saveWordBank(list);
          set({ wordBank: list, learningHistory: hist });
        }
      }
      return { masteredThisRound };
    },

    guessExampleWord: async ({ word, correctAnswers, userAnswer, targetCorrect }) => {
      const settings = get().settings;
      const { ok, degraded } = await judgeMatch({
        word,
        userAnswer,
        correctAnswers,
        settings,
      });
      get().recordResult({
        word,
        correctAnswers,
        userAnswer,
        isCorrect: ok,
        targetCorrect,
      });
      return { isCorrect: ok, degraded };
    },

    buildReviewQueue: (limit = 50) => {
      // 只复习标记为错词的记录
      const list = get().wordBank.filter((w) => w.isWrong);
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

    // ---------- word books ----------
    wordBooks: initial.wordBooks,

    expandedDescendantCount: () => {
      const root = get().rootNode;
      if (!root) return 0;
      let count = 0;
      function traverse(node: WordNode) {
        for (const child of node.children) {
          count++;
          traverse(child);
        }
      }
      traverse(root);
      return count;
    },

    generateWordBook: () => {
      const root = get().rootNode;
      if (!root) return null;
      const count = get().expandedDescendantCount();
      if (count < 5) return null;

      function toBookNode(n: WordNode): WordBookTreeNode {
        return {
          word: n.word,
          chineseMeanings: n.chineseMeanings,
          depth: n.depth,
          children: n.children.map(toBookNode),
        };
      }

      const book: WordBook = {
        id: `wb-${uid()}`,
        rootWord: root.word,
        createdAt: Date.now(),
        nodeCount: count + 1, // 包括根节点
        tree: toBookNode(root),
      };
      const list = [book, ...get().wordBooks];
      Storage.saveWordBooks(list);
      set({ wordBooks: list });
      return book;
    },

    deleteWordBook: (id) => {
      const list = get().wordBooks.filter((b) => b.id !== id);
      Storage.saveWordBooks(list);
      set({ wordBooks: list });
    },
  };
});

export function takeLastMasteredFlag(): boolean {
  const v = useAppStore.getState().lastMasteredFlag;
  useAppStore.setState({ lastMasteredFlag: false });
  return v;
}
