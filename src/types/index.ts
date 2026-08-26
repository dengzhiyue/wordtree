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
  wrongWords: WrongWordRecord[];
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
  queue: WrongWordRecord[];
  index: number;
} | null;
