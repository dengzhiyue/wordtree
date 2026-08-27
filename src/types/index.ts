export type DataSourceMode = 'oxford_api_preferred' | 'llm_only';

export interface Settings {
  dataSource: DataSourceMode;
  oxfordAppId: string;
  oxfordAppKey: string;
  oxfordProxyBase: string;
  llmApiKey: string;
  llmModel: string;
  llmBaseUrl: string;
  targetCorrect: number;
  theme: 'light' | 'dark' | 'system';
}

export interface WordNode {
  id: string;
  word: string;
  englishDefinition: string;
  chineseMeanings: string[];
  children: WordNode[];
  expanded: boolean;
  depth: number;
  parentId: string | null;
  source: 'Oxford' | 'LLM';
}

export interface WrongWordRecord {
  word: string;
  userWrongAnswers: string[];
  correctAnswers: string[];
  wrongCount: number;
  consecutiveCorrect: number;
  targetCorrect: number;
  firstWrongTime: number;
  lastWrongTime: number;
  lastReviewTime: number;
}

/** 单词库记录：查过的词都入库，答错的额外标记 */
export interface WordBankRecord {
  word: string;
  correctAnswers: string[];
  wrongCount: number;
  consecutiveCorrect: number;
  targetCorrect: number;
  firstAddedTime: number;
  lastWrongTime: number; // 0 表示从未答错
  lastReviewTime: number;
  userWrongAnswers: string[];
  isWrong: boolean; // 是否曾答错（控制复习队列）
}

/** 单词书树节点（WordNode 的精简版，只保留展示数据） */
export interface WordBookTreeNode {
  word: string;
  chineseMeanings: string[];
  depth: number;
  children: WordBookTreeNode[];
}

/** 单词书：一次递归查词生成的树 */
export interface WordBook {
  id: string;
  rootWord: string;
  createdAt: number;
  nodeCount: number;
  tree: WordBookTreeNode;
}

export interface MasteredWord {
  word: string;
  masteredTime: number;
  fromWrongBank: boolean;
}

export interface LearningRecord {
  word: string;
  timestamp: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswers: string[];
}

export interface AppStorageShape {
  wrongWords: WrongWordRecord[]; // 兼容旧数据，迁移后不再使用
  wordBank: WordBankRecord[];
  wordBooks: WordBook[];
  masteredWords: MasteredWord[];
  learningHistory: LearningRecord[];
  settings: Settings;
  version: number;
}

export type LookupPhase = 'idle' | 'loading' | 'browsing' | 'testing' | 'result';

export interface SelfTestState {
  userAnswer: string;
  isCorrect: boolean | null;
  correctAnswers: string[];
  word: string;
}

export type ReviewSession = {
  queue: WordBankRecord[];
  index: number;
} | null;
