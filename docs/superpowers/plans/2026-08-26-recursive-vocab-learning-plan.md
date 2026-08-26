# Recursive Vocabulary Learning App 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零搭建一个纯前端的「递归式英文释义词汇学习软件」，支持递归查词、LLM 语义判定自测、错题库复习与深浅色主题，数据全部持久化到 localStorage。

**Architecture:** Vite + React 18 + TS 项目脚手架；分层为 `services/`（纯逻辑）、`store/`（Zustand 单一 store）、`components/`（三个 Tab 页面及其子组件）；Services 不依赖 React；Store 通过 services 读写；组件用 Tailwind 原子类 + 主题 token。

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS 3, Zustand 4, Zod 3, lucide-react, clsx + tailwind-merge.

---

## 文件总览（创建清单）

```
C:\Users\邓\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a8eeb6529c1c42046805e1c
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts          # Vite React 插件 + /oxford 代理
├── tailwind.config.js      # darkMode:'class'，content 覆盖 src + index.html
├── postcss.config.js
├── index.html              # 挂载点 #root，语言 en
└── src/
    ├── main.tsx
    ├── App.tsx             # 三 Tab 路由（内部 state 切换，无需 React Router）
    ├── index.css           # Tailwind 指令 + 主题 CSS 变量 + 自定义动画
    ├── types/index.ts      # §4 全部类型
    ├── utils/
    │   ├── cn.ts           # clsx + tailwind-merge
    │   ├── text.ts         # tokenize（分出可点击词）、formatRelative、normalize
    │   └── zodSchemas.ts   # LLM JSON 响应 zod 校验
    ├── services/
    │   ├── storage.ts      # localStorage 封装
    │   ├── llmClient.ts    # OpenAI 兼容 chat 调用
    │   ├── oxfordClient.ts # Oxford entries/translations
    │   ├── wordFetcher.ts  # 取义策略 Oxford → LLM 兜底
    │   └── semanticJudge.ts# 语义匹配判定
    ├── store/useAppStore.ts# Zustand 3 slices
    └── components/
        ├── layout/NavBar.tsx
        ├── layout/FirstRunGuide.tsx
        ├── layout/ResultToast.tsx
        ├── lookup/LookupPage.tsx
        ├── lookup/WordInput.tsx
        ├── lookup/RecursivePanel.tsx
        ├── lookup/DefinitionLine.tsx
        ├── lookup/NavTree.tsx
        ├── lookup/DepthIndicator.tsx
        ├── lookup/SelfTestCard.tsx
        ├── wrong-bank/WrongBankPage.tsx
        ├── wrong-bank/StatsBanner.tsx
        ├── wrong-bank/WrongWordTable.tsx
        ├── wrong-bank/ReviewModal.tsx
        ├── wrong-bank/ProgressBar.tsx
        └── settings/
            ├── SettingsPage.tsx
            ├── DataSourceSelect.tsx
            ├── OxfordApiConfig.tsx
            ├── LlmApiConfig.tsx
            ├── TargetCorrectSlider.tsx
            └── DangerZone.tsx
```

---

## Task 1：初始化工程配置（package.json / tsconfig / vite / tailwind）

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "recursive-vocab",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.451.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.4",
    "zod": "^3.23.8",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}
```

- [ ] **Step 2: 写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: 写 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: 写 vite.config.ts（关键：/oxford 代理 + @ 路径别名）**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/oxford': {
        target: 'https://od-api.oxforddictionaries.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/oxford/, ''),
        secure: true,
      },
    },
  },
});
```

- [ ] **Step 5: 写 tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          soft: 'rgb(var(--brand-soft) / <alpha-value>)',
        },
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--surface-muted) / <alpha-value>)',
        ink: 'rgb(var(--text) / <alpha-value>)',
        'ink-muted': 'rgb(var(--text-muted) / <alpha-value>)',
        stroke: 'rgb(var(--border) / <alpha-value>)',
        success: '#10b981',
        danger: '#ef4444',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        pop: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '60%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideDown: {
          '0%': { maxHeight: '0', opacity: '0' },
          '100%': { maxHeight: '1200px', opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn .25s ease-out both',
        pop: 'pop .35s cubic-bezier(.2,.9,.3,1.2) both',
        slideDown: 'slideDown .3s ease-out both',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 6: 写 postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: 写 index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RecurWords · 递归式英文词汇学习</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Task 2：类型 + 工具函数 + CSS 主题

**Files:**
- Create: `src/index.css`, `src/types/index.ts`, `src/utils/cn.ts`, `src/utils/text.ts`, `src/utils/zodSchemas.ts`

- [ ] **Step 1: src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --brand: 124 58 237;          /* #7c3aed */
    --brand-soft: 237 233 254;    /* #ede9fe */
    --surface: 255 255 255;
    --surface-muted: 244 244 245; /* zinc-100 */
    --text: 24 24 27;             /* zinc-900 */
    --text-muted: 113 113 122;    /* zinc-500 */
    --border: 228 228 231;        /* zinc-200 */
  }
  .dark {
    --brand: 167 139 250;         /* #a78bfa */
    --brand-soft: 46 29 88;       /* 深紫弱色板 */
    --surface: 24 24 27;          /* zinc-900 */
    --surface-muted: 39 39 42;    /* zinc-800 */
    --text: 244 244 245;          /* zinc-100 */
    --text-muted: 161 161 170;    /* zinc-400 */
    --border: 63 63 70;           /* zinc-700 */
  }
  html, body, #root { height: 100%; }
  body {
    @apply bg-surface text-ink;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif;
  }
  .font-serif-en {
    font-family: 'Iowan Old Style', 'Apple Garamond', Georgia, 'Times New Roman', serif;
  }
}
```

- [ ] **Step 2: src/types/index.ts（完整类型）**

```ts
export type DataSourceMode = 'oxford_api_preferred' | 'llm_only';

export interface Settings {
  dataSource: DataSourceMode;
  oxfordAppId: string;
  oxfordAppKey: string;
  oxfordProxyBase: string; // 选填，生产 CORS 代理
  llmApiKey: string;
  llmModel: string;
  llmBaseUrl: string;
  targetCorrect: number; // 1..10
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
```

- [ ] **Step 3: src/utils/cn.ts**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: src/utils/text.ts**

```ts
export type Token = { type: 'word' | 'punct' | 'ws'; value: string; clean?: string };

/**
 * 将释义句子分 token。只有 type=word 且 clean 长度 >=3 才是可点击的英文词。
 */
export function tokenize(sentence: string): Token[] {
  const tokens: Token[] = [];
  const re = /[A-Za-z][A-Za-z'\-]*|[\u4e00-\u9fa5]+|\s+|[^\sA-Za-z\u4e00-\u9fa5]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence)) !== null) {
    const v = m[0];
    if (/^\s+$/.test(v)) tokens.push({ type: 'ws', value: v });
    else if (/^[A-Za-z][A-Za-z'\-]*$/.test(v)) {
      const clean = v.replace(/[^A-Za-z]/g, '').toLowerCase();
      tokens.push({ type: 'word', value: v, clean });
    } else if (/^[\u4e00-\u9fa5]+$/.test(v)) {
      tokens.push({ type: 'punct', value: v }); // 中文释义词整体可点暂不支持，当普通文本
    } else {
      tokens.push({ type: 'punct', value: v });
    }
  }
  return tokens;
}

export function isClickable(t: Token): boolean {
  return t.type === 'word' && !!t.clean && t.clean.length >= 3;
}

/** 中文规范化：去掉首尾空白、标点，全角半角统一 */
export function normalizeChinese(raw: string): string {
  return raw
    .trim()
    .replace(/^[\s\u3000，。；：！？、,.!?:;"'“”‘’()（）\[\]【】\-—…·]+/, '')
    .replace(/[\s\u3000，。；：！？、,.!?:;"'“”‘’()（）\[\]【】\-—…·]+$/, '');
}

export function formatRelative(ts: number): string {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const min = 60 * 1000, hr = 60 * min, day = 24 * hr;
  if (diff < min) return '刚刚';
  if (diff < hr) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hr)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
```

- [ ] **Step 5: src/utils/zodSchemas.ts**

```ts
import { z } from 'zod';

export const DefinitionSchema = z.object({
  definition: z.string().min(1),
  source: z.string().optional(),
});

export const ChineseMeaningsSchema = z
  .array(z.string())
  .or(z.object({ meanings: z.array(z.string()) }).transform((o) => o.meanings));

export const BoolTextSchema = z.enum(['true', 'false']);
```

---

## Task 3：Service 层 — storage + llmClient + oxfordClient + wordFetcher + semanticJudge

**Files:**
- Create: `src/services/storage.ts`, `src/services/llmClient.ts`, `src/services/oxfordClient.ts`,
  `src/services/wordFetcher.ts`, `src/services/semanticJudge.ts`

- [ ] **Step 1: src/services/storage.ts**

```ts
import type {
  AppStorageShape,
  Settings,
  LearningRecord,
  MasteredWord,
  WrongWordRecord,
} from '@/types';

const KEY = 'recurwords.storage.v1';

export const DEFAULT_SETTINGS: Settings = {
  dataSource: 'oxford_api_preferred',
  oxfordAppId: '',
  oxfordAppKey: '',
  oxfordProxyBase: '',
  llmApiKey: '',
  llmModel: 'gpt-4o-mini',
  llmBaseUrl: 'https://api.openai.com/v1',
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
      // QuotaExceeded → 让上层通过 read catch 检测
      console.error('[Storage] Quota exceeded:', e);
      throw e;
    }
  }

  // ----- domain helpers -----

  static get<K extends keyof AppStorageShape>(k: K): AppStorageShape[K] {
    return Storage.read()[k];
  }

  static set<K extends keyof AppStorageShape>(
    k: K,
    v: AppStorageShape[K],
  ): void {
    const all = Storage.read();
    all[k] = v;
    Storage.write(all);
  }

  static remove(_k: keyof AppStorageShape): void {
    // 语义保持：移除一个域 = 用默认值覆盖
    // （为了不暴露整个 key 给外部使用，我们用字段级还原）
    const all = Storage.read();
    const def = DEFAULT_STORAGE as any;
    (all as any)[_k] = def[_k];
    Storage.write(all);
  }

  static resetAll(): void {
    window.localStorage.removeItem(KEY);
    Storage.write(DEFAULT_STORAGE);
  }

  static ensureInitialized(): AppStorageShape {
    return Storage.read();
  }

  // ---------- 领域操作 ----------

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
```

- [ ] **Step 2: src/services/llmClient.ts**

```ts
import type { Settings } from '@/types';
import type { ZodSchema } from 'zod';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMNotConfiguredError extends Error {
  constructor() {
    super('请先在「设置」页填入 LLM API Key。');
  }
}

async function request(settings: Settings, messages: ChatMessage, json: boolean) {
  if (!settings.llmApiKey.trim()) throw new LLMNotConfiguredError();
  const base = settings.llmBaseUrl.replace(/\/$/, '');
  const url = `${base}/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.llmApiKey}`,
      },
      body: JSON.stringify({
        model: settings.llmModel,
        messages,
        temperature: 0.1,
        ...(json ? { response_format: { type: 'json_object' as const } } : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    if (!content) throw new Error('LLM 返回空内容。');
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

export async function llmChat(
  settings: Settings,
  userPrompt: string,
  systemPrompt = '你是一个严谨的词典助手，遵循用户要求的格式严格输出。',
): Promise<string> {
  return request(
    settings,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    false,
  );
}

export async function llmJson<T>(
  settings: Settings,
  userPrompt: string,
  schema: ZodSchema<T>,
  systemPrompt = '你是一个严谨的 JSON 输出助手。严格按请求返回 JSON，不要多余解释。',
): Promise<T> {
  const content = await request(
    settings,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt + '\n\n请只输出合法 JSON。' },
    ],
    true,
  );
  try {
    const parsed = JSON.parse(content);
    const validated = schema.parse(parsed);
    return validated;
  } catch (e) {
    console.error('[llmJson] parse error:', content);
    throw new Error('LLM 输出的 JSON 格式不正确：' + (e as Error).message);
  }
}

/** 发送一条 "ping"，用于设置页测试连接 */
export async function llmPing(settings: Settings): Promise<boolean> {
  const out = await llmChat(settings, '只输出一个词：OK');
  return out.trim().length > 0;
}
```

- [ ] **Step 3: src/services/oxfordClient.ts**

```ts
import type { Settings } from '@/types';

function buildBase(settings: Settings, useProxy = import.meta.env.DEV): string {
  if (settings.oxfordProxyBase.trim()) {
    return settings.oxfordProxyBase.replace(/\/$/, '');
  }
  if (useProxy) return '/oxford/api/v2';
  return 'https://od-api.oxforddictionaries.com/api/v2';
}

async function request<T = any>(path: string, settings: Settings): Promise<T | null> {
  if (!settings.oxfordAppId.trim() || !settings.oxfordAppKey.trim()) return null;
  const base = buildBase(settings);
  const url = `${base}${path}`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: {
        app_id: settings.oxfordAppId,
        app_key: settings.oxfordAppKey,
        Accept: 'application/json',
      },
      signal: ctl.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn('[Oxford] HTTP', res.status);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn('[Oxford] fetch failed', e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

interface OxfordEntry {
  results?: Array<{
    lexicalEntries?: Array<{
      entries?: Array<{
        senses?: Array<{ definitions?: string[] }>;
      }>;
    }>;
  }>;
}

export async function fetchEnglishDefinition(
  word: string,
  settings: Settings,
): Promise<string | null> {
  const data = await request<OxfordEntry>(
    `/entries/en-gb/${encodeURIComponent(word.toLowerCase())}`,
    settings,
  );
  if (!data) return null;
  const defs: string[] = [];
  for (const r of data.results ?? []) {
    for (const lex of r.lexicalEntries ?? []) {
      for (const e of lex.entries ?? []) {
        for (const s of e.senses ?? []) {
          for (const d of s.definitions ?? []) {
            if (d && !defs.includes(d)) defs.push(d);
            if (defs.length >= 2) return defs.join(' ');
          }
        }
      }
    }
  }
  return defs.length ? defs.join(' ') : null;
}

interface Translation {
  results?: Array<{
    lexicalEntries?: Array<{
      entries?: Array<{
        senses?: Array<{
          translations?: Array<{ text?: string }>;
        }>;
      }>;
    }>;
  }>;
}

export async function fetchChineseMeanings(
  word: string,
  settings: Settings,
): Promise<string[] | null> {
  const data = await request<Translation>(
    `/translations/en/zh/${encodeURIComponent(word.toLowerCase())}`,
    settings,
  );
  if (!data) return null;
  const set = new Set<string>();
  for (const r of data.results ?? []) {
    for (const lex of r.lexicalEntries ?? []) {
      for (const e of lex.entries ?? []) {
        for (const s of e.senses ?? []) {
          for (const t of s.translations ?? []) {
            if (t.text) set.add(t.text);
          }
        }
      }
    }
  }
  if (set.size === 0) return null;
  return [...set].slice(0, 8);
}
```

- [ ] **Step 4: src/services/wordFetcher.ts**

```ts
import type { Settings } from '@/types';
import { fetchChineseMeanings, fetchEnglishDefinition } from './oxfordClient';
import { llmJson } from './llmClient';
import { ChineseMeaningsSchema, DefinitionSchema } from '@/utils/zodSchemas';

export interface FetchWordResult {
  englishDefinition: string;
  chineseMeanings: string[];
  source: 'Oxford' | 'LLM';
}

const LLM_DEFINITION_PROMPT = (w: string) =>
  `请基于牛津高阶英语词典（Oxford Advanced Learner's Dictionary）的释义原文，给出单词 '${w}' 的英文释义（1-2句）。不要在解释中使用该单词本身。返回 JSON：{"definition": "释义内容", "source": "Oxford via LLM"}`;

const LLM_CHINESE_PROMPT = (w: string) =>
  `请基于牛津英汉双解词典，列出英文单词 '${w}' 的所有中文释义。严格返回 JSON 字符串数组，如 ["意思1","意思2"]。不要多余文字。`;

export async function fetchWord(
  word: string,
  settings: Settings,
): Promise<FetchWordResult> {
  if (settings.dataSource === 'oxford_api_preferred' && settings.oxfordAppId && settings.oxfordAppKey) {
    const [def, zh] = await Promise.all([
      fetchEnglishDefinition(word, settings),
      fetchChineseMeanings(word, settings),
    ]);
    if (def && zh && zh.length) {
      return { englishDefinition: def, chineseMeanings: zh, source: 'Oxford' };
    }
  }
  // LLM fallback
  const [defRes, zhRes] = await Promise.all([
    llmJson(settings, LLM_DEFINITION_PROMPT(word), DefinitionSchema),
    llmJson(settings, LLM_CHINESE_PROMPT(word), ChineseMeaningsSchema),
  ]);
  const meanings = Array.isArray(zhRes) ? zhRes : [];
  return {
    englishDefinition: defRes.definition,
    chineseMeanings: meanings,
    source: 'LLM',
  };
}
```

- [ ] **Step 5: src/services/semanticJudge.ts**

```ts
import type { Settings } from '@/types';
import { llmChat } from './llmClient';
import { normalizeChinese } from '@/utils/text';

const PROMPT = (word: string, user: string, list: string[]) =>
  `用户对单词 '${word}' 给出的中文意思是："${user}"。\n` +
  `牛津英汉双解词典的正确中文释义列表：${JSON.stringify(list)}。\n` +
  `请判断用户答案是否与其中任一正确答案语义相符（允许常见近义、同义词，但不能是明显错位/不相关的概念）。\n` +
  `严格只输出 "true" 或 "false"，不要任何其他字符。`;

function simpleExactMatch(user: string, list: string[]): boolean {
  const u = normalizeChinese(user);
  if (!u) return false;
  return list.some((c) => {
    const n = normalizeChinese(c);
    if (!n) return false;
    return n === u || n.includes(u) || u.includes(n);
  });
}

export async function judgeMatch(params: {
  word: string;
  userAnswer: string;
  correctAnswers: string[];
  settings: Settings;
}): Promise<{ ok: boolean; degraded: boolean }> {
  const { word, userAnswer, correctAnswers, settings } = params;
  if (!correctAnswers.length) return { ok: true, degraded: false };
  if (simpleExactMatch(userAnswer, correctAnswers)) return { ok: true, degraded: false };
  if (!settings.llmApiKey.trim()) {
    return { ok: false, degraded: true };
  }
  try {
    const out = await llmChat(settings, PROMPT(word, userAnswer, correctAnswers));
    const v = out.trim().toLowerCase().replace(/[^\w]/g, '');
    return { ok: v.startsWith('true'), degraded: false };
  } catch (e) {
    console.warn('[semanticJudge] fallback to exact-only due to:', e);
    return { ok: simpleExactMatch(userAnswer, correctAnswers), degraded: true };
  }
}
```

---

## Task 4：Zustand Store（3 slices + 跨 slice 协作）

**Files:**
- Create: `src/store/useAppStore.ts`

- [ ] **Step 1: 写完整 store 代码**

```ts
import { create } from 'zustand';
import { Storage } from '@/services/storage';
import { fetchWord } from '@/services/wordFetcher';
import { judgeMatch } from '@/services/semanticJudge';
import type {
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
  setSettings: (p: Partial<Settings>) => void;
  resetSettings: () => void;
  applyTheme: (theme: Settings['theme']) => void;

  // ---------- word tree ----------
  phase: LookupPhase;
  rootWord: string | null;
  rootNode: WordNode | null;
  focusNodeId: string | null;
  errorMsg: string | null;
  selfTest: SelfTestState | null;
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
  addOrUpdateWrong: (p: {
    word: string;
    wrongAnswer: string;
    correctAnswers: string[];
  }) => void;
  removeFromWrongBank: (word: string) => void; // → mastered
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
  listView: (p: { keyword: string; sort: 'wrongCount' | 'lastWrongTime' }) => WrongWordRecord[];

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

function cloneNodeExpandFlag(n: WordNode, expanded: boolean): WordNode {
  return { ...n, expanded, children: n.children.map((c) => cloneNodeExpandFlag(c, expanded)) };
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
  window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
      if (get().settings.theme === 'system') applyThemeDOM('system');
    });

  return {
    // ---------- settings ----------
    settings: initial.settings,
    setSettings: (p) => {
      const next = { ...get().settings, ...p };
      Storage.saveSettings(next);
      if (p.theme) applyThemeDOM(next.theme);
      set({ settings: next });
    },
    resetSettings: () => {
      const s = { ...Storage.DEFAULT_SETTINGS };
      Storage.saveSettings(s);
      applyThemeDOM(s.theme);
      set({ settings: s });
    },
    applyTheme: (t) => get().setSettings({ theme: t }),

    // ---------- word tree ----------
    phase: 'idle',
    rootWord: null,
    rootNode: null,
    focusNodeId: null,
    errorMsg: null,
    selfTest: null,

    startLookup: async (wRaw) => {
      const w = wRaw.trim().toLowerCase();
      if (!w) return;
      set({ phase: 'loading', errorMsg: null, selfTest: null, rootWord: w });
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
      // 已存在同名子节点 → 直接展开
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
      // 如果是 collapse root 就什么也不做
      set({
        rootNode: updateNode(r, nodeId, (n) => ({ ...n, expanded: false, children: [] })),
      });
    },

    setFocus: (id) => set({ focusNodeId: id }),

    collapseAllButRoot: () => {
      const r = get().rootNode;
      if (!r) return;
      const next = mapTree(r, (n) => ({
        ...n,
        expanded: n.depth === 0,
        children: n.depth === 0 ? n.children.map((c) => cloneNodeExpandFlag(c, false)) : [],
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
      if (!get().selfTest) return;
      set({ selfTest: { ...get().selfTest!, userAnswer: v } });
    },

    checkAnswer: async () => {
      const state = get();
      const st = state.selfTest;
      if (!st || !st.userAnswer.trim()) return;
      const { ok, degraded } = await judgeMatch({
        word: st.word,
        userAnswer: st.userAnswer,
        correctAnswers: st.correctAnswers,
        settings: state.settings,
      });
      const { masteredThisRound } = get().recordResult({
        word: st.word,
        correctAnswers: st.correctAnswers,
        userAnswer: st.userAnswer,
        isCorrect: ok,
        targetCorrect: state.settings.targetCorrect,
      });
      set({
        phase: 'result',
        selfTest: {
          ...st,
          isCorrect: ok,
        },
        errorMsg: degraded ? '语义服务不可用，已用近似判定替代。' : null,
      });
      // 给调用方一个信号？直接写入 store 里的一个临时 flag 就好
      (get() as any)._lastMasteredFlag = masteredThisRound;
    },

    resetTree: () =>
      set({
        phase: 'idle',
        rootWord: null,
        rootNode: null,
        focusNodeId: null,
        selfTest: null,
        errorMsg: null,
      }),

    // ---------- wrong bank ----------
    wrongWords: initial.wrongWords,
    masteredWords: initial.masteredWords,

    addOrUpdateWrong: ({ word, wrongAnswer, correctAnswers }) => {
      const now = Date.now();
      const list = [...get().wrongWords];
      const idx = list.findIndex((w) => w.word === word);
      if (idx >= 0) {
        const prev = list[idx];
        list[idx] = {
          ...prev,
          wrongCount: prev.wrongCount + 1,
          lastWrongTime: now,
          lastReviewTime: now,
          consecutiveCorrect: 0,
          correctAnswers: correctAnswers.length ? correctAnswers : prev.correctAnswers,
          userWrongAnswers: [...prev.userWrongAnswers, wrongAnswer],
        };
      } else {
        list.push({
          word,
          correctAnswers,
          wrongCount: 1,
          consecutiveCorrect: 0,
          targetCorrect: get().settings.targetCorrect,
          firstWrongTime: now,
          lastWrongTime: now,
          lastReviewTime: now,
          userWrongAnswers: wrongAnswer ? [wrongAnswer] : [],
        });
      }
      Storage.saveWrongWords(list);
      set({ wrongWords: list });
    },

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
        .map((word) => ({
          word,
          masteredTime: Date.now(),
          fromWrongBank: true,
        }));
      const mList = [...get().masteredWords, ...add];
      Storage.saveMasteredWords(mList);
      set({ wrongWords: list, masteredWords: mList });
    },

    recordResult: ({ word, correctAnswers, userAnswer, isCorrect, targetCorrect }) => {
      // append learning history
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
            userWrongAnswers: [...wrongList[idx].userWrongAnswers, userAnswer],
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
        set({ wrongWords, learningHistory: hist });
      } else {
        if (idx >= 0) {
          const r = wrongList[idx];
          const next = {
            ...r,
            consecutiveCorrect: r.consecutiveCorrect + 1,
            lastReviewTime: Date.now(),
          };
          if (next.consecutiveCorrect >= next.targetCorrect) {
            // 攻克 → 移出
            wrongList.splice(idx, 1);
            const mList = [
              ...get().masteredWords.filter((m) => m.word !== word),
              { word, masteredTime: Date.now(), fromWrongBank: true },
            ];
            Storage.saveMasteredWords(mList);
            masteredThisRound = true;
            set({ masteredWords: mList });
          } else {
            wrongList[idx] = next;
          }
          Storage.saveWrongWords(wrongList);
          set({ wrongWords, learningHistory: hist });
        } else {
          // 新词答对 → 加入已掌握（去重）
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

    listView: ({ keyword, sort }) => {
      const kw = keyword.trim().toLowerCase();
      let arr = get().wrongWords.filter((w) =>
        kw ? w.word.toLowerCase().includes(kw) : true,
      );
      arr = arr.slice().sort((a, b) => {
        if (sort === 'wrongCount') return b.wrongCount - a.wrongCount;
        return b.lastWrongTime - a.lastWrongTime;
      });
      return arr;
    },

    // ---------- review session ----------
    reviewSession: null,
    startReview: (queue) => set({ reviewSession: { queue, index: 0 } }),
    advanceReview: () => {
      const s = get().reviewSession;
      if (!s) return;
      if (s.index + 1 >= s.queue.length) set({ reviewSession: { ...s, index: s.queue.length } });
      else set({ reviewSession: { ...s, index: s.index + 1 } });
    },
    closeReview: () => set({ reviewSession: null }),
  };
});

/** 读最后一次是否攻克（React 用 useRef + useEffect 判断） */
export function takeLastMasteredFlag(): boolean {
  const s = useAppStore.getState() as any;
  const v = !!s._lastMasteredFlag;
  s._lastMasteredFlag = false;
  return v;
}
```

---

## Task 5：基础入口 + Layout 组件（main/App/NavBar/FirstRunGuide/ResultToast）

**Files:**
- Create: `src/main.tsx`, `src/App.tsx`, `src/components/layout/NavBar.tsx`,
  `src/components/layout/FirstRunGuide.tsx`, `src/components/layout/ResultToast.tsx`

- [ ] **Step 1: src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 2: src/App.tsx**

```tsx
import { useState } from 'react';
import NavBar from '@/components/layout/NavBar';
import LookupPage from '@/components/lookup/LookupPage';
import WrongBankPage from '@/components/wrong-bank/WrongBankPage';
import SettingsPage from '@/components/settings/SettingsPage';
import FirstRunGuide from '@/components/layout/FirstRunGuide';
import { useAppStore } from '@/store/useAppStore';

type Tab = 'lookup' | 'wrong' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('lookup');
  const settings = useAppStore((s) => s.settings);
  const needGuide = tab === 'lookup' && !settings.llmApiKey.trim();

  return (
    <div className="min-h-full flex flex-col">
      <NavBar active={tab} onChange={setTab} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {needGuide && <FirstRunGuide onSetup={() => setTab('settings')} />}
        <div key={tab} className="animate-fadeIn">
          {tab === 'lookup' && <LookupPage />}
          {tab === 'wrong' && <WrongBankPage />}
          {tab === 'settings' && <SettingsPage />}
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-ink-muted">
        🔁 RecurWords · 用英文解释英文，递归理解直至掌握 · 本地存储，数据隐私
      </footer>
    </div>
  );
}
```

- [ ] **Step 3: src/components/layout/NavBar.tsx**

```tsx
import { BookOpen, Bug, Settings, Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/store/useAppStore';

type Props = {
  active: 'lookup' | 'wrong' | 'settings';
  onChange: (t: 'lookup' | 'wrong' | 'settings') => void;
};

const tabs = [
  { id: 'lookup' as const, label: '查单词', icon: BookOpen },
  { id: 'wrong' as const, label: '错题库', icon: Bug },
  { id: 'settings' as const, label: '设置', icon: Settings },
];

export default function NavBar({ active, onChange }: Props) {
  const theme = useAppStore((s) => s.settings.theme);
  const set = useAppStore((s) => s.setSettings);
  const cycleTheme = () => {
    const n: Record<typeof theme, typeof theme> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    };
    set({ theme: n[theme] });
  };
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur border-b border-stroke">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-6">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <span className="text-xl">🔁</span>
          <span>RecurWords</span>
        </div>
        <nav className="flex items-center gap-1 flex-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                'px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 transition',
                active === id
                  ? 'text-brand bg-brand-soft'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-muted',
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={cycleTheme}
          title={`主题：${theme}`}
          className="p-2 rounded-md text-ink-muted hover:text-ink hover:bg-surface-muted transition"
        >
          <ThemeIcon size={18} />
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: src/components/layout/FirstRunGuide.tsx**

```tsx
import { Sparkles } from 'lucide-react';

export default function FirstRunGuide({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="mb-6 p-4 rounded-xl border border-brand/30 bg-brand-soft/50 text-ink animate-fadeIn">
      <div className="flex items-start gap-3">
        <Sparkles className="text-brand shrink-0" size={22} />
        <div className="flex-1">
          <div className="font-semibold">欢迎使用 RecurWords！</div>
          <p className="mt-1 text-sm text-ink-muted">
            开始之前，请先到「设置」页填写 LLM API Key（用于兜底释义与中文语义判定）。
            如果你有 Oxford Dictionaries 的 app_id/app_key，也建议一并填写以获得最准确的释义。
          </p>
        </div>
        <button
          type="button"
          onClick={onSetup}
          className="px-3 py-1.5 text-sm rounded-md bg-brand text-white hover:opacity-90 transition"
        >
          前往设置
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: src/components/layout/ResultToast.tsx**

```tsx
import { Check, X, PartyPopper, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ToastKind = 'correct' | 'wrong' | 'mastered' | 'warn';

export default function ResultToast({
  kind,
  title,
  desc,
}: {
  kind: ToastKind;
  title: string;
  desc?: string;
}) {
  const styles = {
    correct: 'border-success/40 bg-success/10 text-success',
    wrong: 'border-danger/40 bg-danger/10 text-danger',
    mastered: 'border-brand/40 bg-brand-soft text-brand',
    warn: 'border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-500/10',
  }[kind];
  const Icon =
    kind === 'correct' ? Check : kind === 'wrong' ? X : kind === 'mastered' ? PartyPopper : Info;
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border animate-pop',
        styles,
      )}
    >
      <Icon size={22} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{title}</div>
        {desc && <div className="text-sm opacity-90 mt-0.5">{desc}</div>}
      </div>
    </div>
  );
}
```

---

## Task 6：查单词页组件

**Files:**
- Create: `src/components/lookup/LookupPage.tsx`, `WordInput.tsx`, `RecursivePanel.tsx`,
  `DefinitionLine.tsx`, `NavTree.tsx`, `DepthIndicator.tsx`, `SelfTestCard.tsx`

- [ ] **Step 1: src/components/lookup/WordInput.tsx**

```tsx
import { Search } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';

export default function WordInput() {
  const start = useAppStore((s) => s.startLookup);
  const phase = useAppStore((s) => s.phase);
  const [v, setV] = useState('');
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(v);
  };
  const loading = phase === 'loading';
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="输入英文单词，如 recursive, ephemeral..."
          className="w-full h-11 pl-10 pr-3 rounded-lg bg-surface border border-stroke focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-ink placeholder:text-ink-muted"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !v.trim()}
        className="h-11 px-5 rounded-lg bg-brand text-white font-medium disabled:opacity-60 hover:opacity-90 transition"
      >
        {loading ? '查询中…' : '查询'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: src/components/lookup/DefinitionLine.tsx**

```tsx
import type { WordNode } from '@/types';
import { isClickable, tokenize } from '@/utils/text';
import { cn } from '@/utils/cn';
import { Minus2 } from 'lucide-react';

type Props = {
  node: WordNode;
  onWordClick: (parentId: string, word: string) => void;
  onCollapse: (nodeId: string) => void;
  focusNodeId: string | null;
  onFocus: (id: string | null) => void;
  renderChildren?: React.ReactNode;
};

const depthColor = [
  'border-l-brand',
  'border-l-sky-500',
  'border-l-amber-500',
  'border-l-emerald-500',
  'border-l-rose-500',
];

export default function DefinitionLine({
  node,
  onWordClick,
  onCollapse,
  focusNodeId,
  onFocus,
  renderChildren,
}: Props) {
  const tokens = tokenize(node.englishDefinition);
  const border = depthColor[node.depth % depthColor.length];
  const focused = focusNodeId === node.id;
  return (
    <section
      id={`node-${node.id}`}
      onMouseEnter={() => onFocus(node.id)}
      className={cn(
        'mb-3 rounded-lg border border-stroke bg-surface-muted/60 border-l-4 p-4 transition',
        border,
        focused && 'ring-2 ring-brand/40',
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-serif-en text-ink text-xl font-semibold">{node.word}</span>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              node.source === 'Oxford'
                ? 'bg-brand-soft text-brand'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
            )}
          >
            {node.source === 'Oxford' ? '📖 Oxford' : '🤖 Oxford via LLM'}
          </span>
          <span className="text-xs text-ink-muted">深度 {node.depth}</span>
        </div>
        {node.depth > 0 && (
          <button
            type="button"
            onClick={() => onCollapse(node.id)}
            title="收起并清除下级"
            className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface transition"
          >
            <Minus2 size={16} />
          </button>
        )}
      </header>
      <p className="mt-2 font-serif-en leading-relaxed text-ink">
        {tokens.map((t, i) => {
          if (t.type === 'ws') return <span key={i}>{t.value}</span>;
          if (!isClickable(t)) return <span key={i}>{t.value}</span>;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onWordClick(node.id, t.clean!)}
              className="text-brand border-b border-dotted border-brand/60 hover:text-brand/80 hover:bg-brand-soft/50 px-0.5 rounded transition"
            >
              {t.value}
            </button>
          );
        })}
      </p>
      {renderChildren}
    </section>
  );
}
```

- [ ] **Step 3: src/components/lookup/RecursivePanel.tsx**

```tsx
import type { WordNode } from '@/types';
import DefinitionLine from './DefinitionLine';
import { cn } from '@/utils/cn';

type Props = {
  root: WordNode;
  onWordClick: (pid: string, w: string) => void;
  onCollapse: (id: string) => void;
  focusNodeId: string | null;
  onFocus: (id: string | null) => void;
};

function Node({
  node,
  onWordClick,
  onCollapse,
  focusNodeId,
  onFocus,
}: {
  node: WordNode;
} & Omit<Props, 'root'>) {
  const kids = node.expanded ? node.children : [];
  return (
    <>
      <DefinitionLine
        node={node}
        onWordClick={onWordClick}
        onCollapse={onCollapse}
        focusNodeId={focusNodeId}
        onFocus={onFocus}
        renderChildren={
          kids.length ? (
            <div
              className={cn(
                'mt-4 animate-slideDown overflow-hidden',
                node.depth === 0 ? 'pl-4 sm:pl-6' : 'pl-3 sm:pl-5',
              )}
            >
              {kids.map((c) => (
                <Node
                  key={c.id}
                  node={c}
                  onWordClick={onWordClick}
                  onCollapse={onCollapse}
                  focusNodeId={focusNodeId}
                  onFocus={onFocus}
                />
              ))}
            </div>
          ) : undefined
        }
      />
    </>
  );
}

export default function RecursivePanel(p: Props) {
  return (
    <div className="space-y-1">
      <Node
        node={p.root}
        onWordClick={p.onWordClick}
        onCollapse={p.onCollapse}
        focusNodeId={p.focusNodeId}
        onFocus={p.onFocus}
      />
    </div>
  );
}
```

- [ ] **Step 4: src/components/lookup/NavTree.tsx**

```tsx
import { ChevronRight } from 'lucide-react';
import type { WordNode } from '@/types';
import { cn } from '@/utils/cn';

type Props = {
  root: WordNode;
  focusId: string | null;
  onJump: (id: string) => void;
};

function Item({
  node,
  focusId,
  onJump,
  depth,
}: {
  node: WordNode;
  focusId: string | null;
  onJump: (id: string) => void;
  depth: number;
}) {
  const active = focusId === node.id;
  return (
    <div>
      <button
        type="button"
        onClick={() => onJump(node.id)}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={cn(
          'w-full text-left flex items-center gap-1 py-1.5 pr-2 rounded-md text-sm transition',
          active
            ? 'text-brand bg-brand-soft font-medium'
            : 'text-ink-muted hover:text-ink hover:bg-surface-muted',
        )}
      >
        <ChevronRight
          size={14}
          className={cn('transition', node.expanded && 'rotate-90')}
        />
        <span className="truncate">{node.word}</span>
      </button>
      {node.expanded
        ? node.children.map((c) => (
            <Item
              key={c.id}
              node={c}
              focusId={focusId}
              onJump={onJump}
              depth={depth + 1}
            />
          ))
        : null}
    </div>
  );
}

export default function NavTree({ root, focusId, onJump }: Props) {
  return (
    <div className="rounded-xl border border-stroke bg-surface p-3 overflow-auto max-h-[70vh]">
      <div className="text-xs text-ink-muted px-2 pb-2 border-b border-stroke mb-2">
        递归导航树
      </div>
      <Item node={root} focusId={focusId} onJump={onJump} depth={0} />
    </div>
  );
}
```

- [ ] **Step 5: src/components/lookup/DepthIndicator.tsx**

```tsx
import type { WordNode } from '@/types';

function maxDepth(n: WordNode): number {
  if (!n.children.length) return n.depth;
  return Math.max(n.depth, ...n.children.map(maxDepth));
}

export default function DepthIndicator({ root }: { root: WordNode }) {
  const d = maxDepth(root);
  const tags = Array.from({ length: d + 1 }, (_, i) => i);
  return (
    <div className="flex items-center gap-2 text-xs text-ink-muted">
      <span>当前共展开</span>
      <div className="flex gap-1">
        {tags.map((i) => (
          <span
            key={i}
            className="px-1.5 py-0.5 rounded bg-surface-muted border border-stroke"
          >
            {i} 层
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: src/components/lookup/SelfTestCard.tsx**

```tsx
import { useAppStore } from '@/store/useAppStore';
import ResultToast, { ToastKind } from '@/components/layout/ResultToast';
import { useEffect, useState } from 'react';
import { takeLastMasteredFlag } from '@/store/useAppStore';
import { ArrowRight, RotateCcw } from 'lucide-react';

export default function SelfTestCard() {
  const st = useAppStore((s) => s.selfTest);
  const phase = useAppStore((s) => s.phase);
  const setAnswer = useAppStore((s) => s.setUserAnswer);
  const check = useAppStore((s) => s.checkAnswer);
  const reset = useAppStore((s) => s.resetTree);
  const goTest = useAppStore((s) => s.enterTest);

  const [mastered, setMastered] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (phase === 'result') {
      setShowResult(true);
      setMastered(takeLastMasteredFlag());
    } else {
      setShowResult(false);
    }
  }, [phase]);

  if (!st) return null;

  const toast: { kind: ToastKind; title: string; desc?: string } | null = showResult
    ? mastered
      ? { kind: 'mastered', title: '恭喜！该词已攻克，已移出错题库 🎉' }
      : st.isCorrect
        ? { kind: 'correct', title: '回答正确！' }
        : { kind: 'wrong', title: '回答错误，已加入错题库', desc: '不要灰心，递归理解每个词再试试。' }
    : null;

  return (
    <div className="rounded-2xl border border-stroke bg-surface p-5 sm:p-6 animate-fadeIn">
      {phase === 'testing' && (
        <>
          <div className="text-sm text-ink-muted">请输入你认为下面单词的中文意思</div>
          <div className="font-serif-en text-3xl sm:text-4xl font-semibold mt-1 text-ink tracking-wide">
            {st.word}
          </div>
          <form
            className="mt-5 flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              check();
            }}
          >
            <input
              autoFocus
              value={st.userAnswer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="如：递归的、循环的"
              className="flex-1 h-11 px-3 rounded-lg bg-surface-muted border border-stroke focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-ink placeholder:text-ink-muted"
            />
            <button
              type="submit"
              disabled={!st.userAnswer.trim()}
              className="h-11 px-5 rounded-lg bg-brand text-white font-medium disabled:opacity-60 hover:opacity-90 transition inline-flex items-center gap-2 justify-center"
            >
              核对答案 <ArrowRight size={16} />
            </button>
          </form>
        </>
      )}

      {phase === 'result' && (
        <div className="space-y-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-serif-en text-2xl font-semibold">{st.word}</span>
            <span className="text-sm text-ink-muted">牛津中文释义：</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-ink">
            {st.correctAnswers.length ? (
              st.correctAnswers.map((c, i) => <li key={i}>{c}</li>)
            ) : (
              <li className="text-ink-muted">（未取到中文释义）</li>
            )}
          </ul>
          {toast && <ResultToast kind={toast.kind} title={toast.title} desc={toast.desc} />}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowResult(false);
                goTest();
              }}
              className="h-10 px-4 rounded-lg border border-stroke hover:bg-surface-muted transition inline-flex items-center gap-2"
            >
              <RotateCcw size={16} /> 重试
            </button>
            <button
              type="button"
              onClick={reset}
              className="h-10 px-4 rounded-lg bg-brand text-white hover:opacity-90 transition"
            >
              再来一个词
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: src/components/lookup/LookupPage.tsx**

```tsx
import WordInput from './WordInput';
import NavTree from './NavTree';
import RecursivePanel from './RecursivePanel';
import DepthIndicator from './DepthIndicator';
import SelfTestCard from './SelfTestCard';
import ResultToast from '@/components/layout/ResultToast';
import { useAppStore } from '@/store/useAppStore';

export default function LookupPage() {
  const root = useAppStore((s) => s.rootNode);
  const phase = useAppStore((s) => s.phase);
  const err = useAppStore((s) => s.errorMsg);
  const focusId = useAppStore((s) => s.focusNodeId);
  const expand = useAppStore((s) => s.expandChild);
  const collapse = useAppStore((s) => s.collapseChild);
  const setFocus = useAppStore((s) => s.setFocus);
  const enterTest = useAppStore((s) => s.enterTest);

  const jump = (id: string) => {
    setFocus(id);
    const el = document.getElementById(`node-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const showTree = root && phase !== 'testing' && phase !== 'result';

  return (
    <div className="space-y-6">
      <WordInput />

      {err && phase !== 'result' && (
        <ResultToast kind="warn" title="提示" desc={err} />
      )}

      {phase === 'idle' && !root && (
        <div className="rounded-2xl border border-dashed border-stroke p-8 text-center text-ink-muted">
          <div className="text-4xl mb-2">🔁</div>
          <div className="font-medium text-ink mb-1">递归式英文释义学习</div>
          <p className="text-sm max-w-xl mx-auto">
            输入一个英文单词 → 看到英文释义 → 点不认识的词继续深挖 → 层层理解直到全部看懂
            → 回到原词自测中文意思 → 答错自动进入错题库。
          </p>
        </div>
      )}

      {root && phase !== 'testing' && phase !== 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
          <aside className="lg:sticky lg:top-24">
            <NavTree root={root} focusId={focusId} onJump={jump} />
            <div className="mt-4">
              <DepthIndicator root={root} />
            </div>
          </aside>
          <div>
            {phase === 'browsing' && (
              <>
                <RecursivePanel
                  root={root}
                  onWordClick={expand}
                  onCollapse={collapse}
                  focusNodeId={focusId}
                  onFocus={setFocus}
                />
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={enterTest}
                    className="h-11 px-5 rounded-lg bg-brand text-white font-medium hover:opacity-90 transition"
                  >
                    我已理解，开始测试
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {(phase === 'testing' || phase === 'result') && (
        <div className="max-w-2xl mx-auto">
          <SelfTestCard />
        </div>
      )}
    </div>
  );
}
```

---

## Task 7：错题库页组件

**Files:**
- Create: `src/components/wrong-bank/WrongBankPage.tsx`, `StatsBanner.tsx`, `WrongWordTable.tsx`,
  `ReviewModal.tsx`, `ProgressBar.tsx`

- [ ] **Step 1: src/components/wrong-bank/ProgressBar.tsx**

```tsx
import { cn } from '@/utils/cn';

export default function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div
      className={cn(
        'h-2 rounded-full bg-surface-muted overflow-hidden',
        className,
      )}
    >
      <div
        className="h-full bg-brand transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
```

- [ ] **Step 2: src/components/wrong-bank/StatsBanner.tsx**

```tsx
import { useAppStore } from '@/store/useAppStore';

function Ring({ rate }: { rate: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const off = c * (1 - rate);
  return (
    <svg viewBox="0 0 120 120" className="w-20 h-20 mx-auto">
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-stroke"
        strokeWidth="10"
      />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-brand"
        strokeWidth="10"
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        strokeDasharray={c}
        strokeDashoffset={off}
        style={{ transition: 'stroke-dashoffset .4s ease' }}
      />
      <text
        x="60"
        y="60"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-current text-ink font-semibold"
        fontSize="18"
      >
        {Math.round(rate * 100)}%
      </text>
    </svg>
  );
}

export default function StatsBanner() {
  const wrong = useAppStore((s) => s.wrongWords);
  const mastered = useAppStore((s) => s.masteredWords);
  const hist = useAppStore((s) =>
    new Set([...wrong.map((w) => w.word), ...mastered.map((m) => m.word)]).size,
  );
  const totalEver = hist;
  const masteredCount = mastered.length;
  const pending = wrong.length;
  const rate = totalEver === 0 ? 0 : masteredCount / totalEver;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: '错题总数', value: wrong.length, tone: 'text-ink' },
        { label: '已攻克', value: masteredCount, tone: 'text-success' },
        { label: '待复习', value: pending, tone: 'text-brand' },
      ].map((k) => (
        <div
          key={k.label}
          className="rounded-xl border border-stroke bg-surface p-4 flex flex-col justify-between"
        >
          <div className="text-sm text-ink-muted">{k.label}</div>
          <div className={`text-2xl font-semibold ${k.tone}`}>{k.value}</div>
        </div>
      ))}
      <div className="rounded-xl border border-stroke bg-surface p-4 flex flex-col items-center">
        <div className="text-sm text-ink-muted">掌握率</div>
        <Ring rate={rate} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: src/components/wrong-bank/WrongWordTable.tsx**

```tsx
import { useMemo, useState } from 'react';
import type { WrongWordRecord } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatRelative } from '@/utils/text';
import ProgressBar from './ProgressBar';
import { Play, LogOut, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type Props = {
  onSingleTest: (word: string) => void;
};

export default function WrongWordTable({ onSingleTest }: Props) {
  const list = useAppStore((s) => s.wrongWords);
  const remove = useAppStore((s) => s.removeFromWrongBank);
  const del = useAppStore((s) => s.deleteRecord);
  const batchDel = useAppStore((s) => s.batchDelete);
  const batchOut = useAppStore((s) => s.batchRemove);

  const [kw, setKw] = useState('');
  const [sort, setSort] = useState<'wrongCount' | 'lastWrongTime'>('wrongCount');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const lower = kw.trim().toLowerCase();
    let r: WrongWordRecord[] = lower
      ? list.filter((w) => w.word.includes(lower))
      : list.slice();
    r.sort((a, b) =>
      sort === 'wrongCount'
        ? b.wrongCount - a.wrongCount
        : b.lastWrongTime - a.lastWrongTime,
    );
    return r;
  }, [list, kw, sort]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.word));

  const toggle = (w: string) => {
    const n = new Set(selected);
    if (n.has(w)) n.delete(w);
    else n.add(w);
    setSelected(n);
  };
  const toggleAll = () => {
    setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.word)));
  };

  const selWords = [...selected];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="h-10 px-3 rounded-lg bg-surface border border-stroke focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none flex-1 text-ink placeholder:text-ink-muted"
          placeholder="搜索错词…"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
        <select
          className="h-10 px-3 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand"
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
        >
          <option value="wrongCount">按错误次数排序</option>
          <option value="lastWrongTime">按最近错误时间排序</option>
        </select>
      </div>

      <div className="rounded-xl border border-stroke overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-ink-muted">
            <tr>
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="accent-brand"
                />
              </th>
              <th className="text-left p-3">单词</th>
              <th className="text-left p-3 w-28">错误次数</th>
              <th className="text-left p-3">连续答对 / 目标</th>
              <th className="text-left p-3 w-40">最近错误</th>
              <th className="text-left p-3 w-60">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-ink-muted">
                  还没有错题，先去「查单词」答对答错两轮吧～
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.word} className="border-t border-stroke hover:bg-surface-muted/40">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.word)}
                    onChange={() => toggle(r.word)}
                    className="accent-brand"
                  />
                </td>
                <td className="p-3 font-serif-en font-semibold text-ink">{r.word}</td>
                <td className="p-3">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs',
                      r.wrongCount >= 3
                        ? 'bg-danger/15 text-danger'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                    )}
                  >
                    {r.wrongCount} 次
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3 max-w-[180px]">
                    <ProgressBar
                      className="flex-1"
                      value={r.consecutiveCorrect}
                      max={r.targetCorrect}
                    />
                    <span className="text-xs text-ink-muted tabular-nums">
                      {r.consecutiveCorrect}/{r.targetCorrect}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-ink-muted">{formatRelative(r.lastWrongTime)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="重新测试"
                      onClick={() => onSingleTest(r.word)}
                      className="p-2 rounded-md hover:bg-surface-muted text-brand"
                    >
                      <Play size={15} />
                    </button>
                    <button
                      type="button"
                      title="移出错题库（标记已掌握）"
                      onClick={() => remove(r.word)}
                      className="p-2 rounded-md hover:bg-surface-muted text-success"
                    >
                      <LogOut size={15} />
                    </button>
                    <button
                      type="button"
                      title="删除记录"
                      onClick={() => {
                        if (confirm(`确认删除错题「${r.word}」？这不会加入已掌握。`))
                          del(r.word);
                      }}
                      className="p-2 rounded-md hover:bg-surface-muted text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selWords.length > 0 && (
        <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-brand-soft/60 text-brand animate-fadeIn">
          <span className="font-medium">已选 {selWords.length} 项：</span>
          <button
            type="button"
            className="px-3 h-8 rounded-md bg-brand text-white hover:opacity-90"
            onClick={() => {
              if (confirm(`将所选 ${selWords.length} 个词标记为已掌握并移出错题库？`)) {
                batchOut(selWords);
                setSelected(new Set());
              }
            }}
          >
            批量移出
          </button>
          <button
            type="button"
            className="px-3 h-8 rounded-md bg-danger text-white hover:opacity-90"
            onClick={() => {
              if (confirm(`删除所选 ${selWords.length} 条错题记录（不含已掌握）？`)) {
                batchDel(selWords);
                setSelected(new Set());
              }
            }}
          >
            批量删除
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: src/components/wrong-bank/ReviewModal.tsx**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { WordNode } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { uid } from '@/utils/text';
import { fetchWord } from '@/services/wordFetcher';
import RecursivePanel from '@/components/lookup/RecursivePanel';
import DefinitionLine from '@/components/lookup/DefinitionLine';
import SelfTestCard from '@/components/lookup/SelfTestCard';
import ProgressBar from './ProgressBar';
import NavTree from '@/components/lookup/NavTree';
import ResultToast from '@/components/layout/ResultToast';
import { takeLastMasteredFlag } from '@/store/useAppStore';

export default function ReviewModal({ onClose }: { onClose: () => void }) {
  const session = useAppStore((s) => s.reviewSession);
  const advance = useAppStore((s) => s.advanceReview);
  const settings = useAppStore((s) => s.settings);
  const recordResult = useAppStore((s) => s.recordResult);

  const record = session?.queue[session.index];

  // 每个词自己的本地递归树 state
  const [phase, setPhase] = useState<'loading' | 'browsing' | 'testing' | 'result'>(
    'loading',
  );
  const [root, setRoot] = useState<WordNode | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState<{ ok: boolean; mastered: boolean; degraded: boolean } | null>(
    null,
  );
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ total: number; correct: number; mastered: number } | null>(
    null,
  );

  const idx = session?.index ?? 0;
  const total = session?.queue.length ?? 0;
  const done = !!session && idx >= total;

  const loadWord = async (w: string) => {
    setPhase('loading');
    setResult(null);
    setErr(null);
    setUserAnswer('');
    try {
      const res = await fetchWord(w, settings);
      const node: WordNode = {
        id: 'r-' + uid(),
        word: w,
        englishDefinition: res.englishDefinition,
        chineseMeanings: res.chineseMeanings,
        children: [],
        expanded: true,
        depth: 0,
        parentId: null,
        source: res.source,
      };
      setRoot(node);
      setFocusId(node.id);
      setPhase('browsing');
    } catch (e) {
      setErr((e as Error).message || '加载失败');
      setPhase('browsing');
    }
  };

  useEffect(() => {
    if (record) loadWord(record.word);
  }, [record?.word]);

  const onWordClick = async (pid: string, word: string) => {
    if (!root) return;
    // mutate by clone: find parent, push/update child
    const parent = findNode(root, pid);
    if (!parent) return;
    const same = parent.children.find(
      (c) => c.word.toLowerCase() === word.toLowerCase(),
    );
    if (same) {
      const nroot = updateNode(root, same.id, (n) => ({ ...n, expanded: true }));
      setRoot(nroot);
      setFocusId(same.id);
      return;
    }
    const res = await fetchWord(word, settings).catch((e) => {
      setErr(e.message);
      return null;
    });
    if (!res) return;
    const newNode: WordNode = {
      id: 'n-' + uid(),
      word,
      englishDefinition: res.englishDefinition,
      chineseMeanings: res.chineseMeanings,
      children: [],
      expanded: true,
      depth: parent.depth + 1,
      parentId: parent.id,
      source: res.source,
    };
    const nroot = updateNode(root, pid, (n) => ({
      ...n,
      children: [...n.children, newNode],
    }));
    setRoot(nroot);
    setFocusId(newNode.id);
  };

  const onCollapse = (nid: string) => {
    if (!root) return;
    setRoot(updateNode(root, nid, (n) => ({ ...n, expanded: false, children: [] })));
  };

  const collapseForTest = () => {
    if (!root) return;
    const f = (n: WordNode, keep: boolean): WordNode => ({
      ...n,
      expanded: keep,
      children: keep ? n.children.map((c) => f(c, false)) : [],
    });
    setRoot(f(root, true));
  };

  const submitCheck = async () => {
    if (!record || !root || !userAnswer.trim()) return;
    // 直接用 judgeMatch 的 store 封装？这里复用 semanticJudge：
    const { judgeMatch } = await import('@/services/semanticJudge');
    const res = await judgeMatch({
      word: record.word,
      userAnswer,
      correctAnswers: root.chineseMeanings,
      settings,
    }).catch(() => ({ ok: false, degraded: true }));
    const { masteredThisRound } = recordResult({
      word: record.word,
      correctAnswers: root.chineseMeanings,
      userAnswer,
      isCorrect: res.ok,
      targetCorrect: settings.targetCorrect,
    });
    // 为了让 SelfTestCard 之外也能显示攻克：取 store 的 flag 并显示一次性弹窗
    takeLastMasteredFlag();
    setResult({ ok: res.ok, mastered: masteredThisRound, degraded: res.degraded });
    setPhase('result');
  };

  const next = () => {
    const totalCorrect = (summary?.correct ?? 0) + (result?.ok ? 1 : 0);
    const totalMastered = (summary?.mastered ?? 0) + (result?.mastered ? 1 : 0);
    const totalDone = idx + 1;
    if (idx + 1 >= total) {
      setSummary({ total: totalDone, correct: totalCorrect, mastered: totalMastered });
      advance();
    } else {
      setSummary({ total: totalDone, correct: totalCorrect, mastered: totalMastered });
      advance();
    }
  };

  const onJump = (id: string) => {
    setFocusId(id);
    document.getElementById(`review-node-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  const progressPct = total === 0 ? 0 : Math.min(100, (idx / total) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 dark:bg-black/60 animate-fadeIn">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl bg-surface border border-stroke shadow-xl flex flex-col">
        <header className="p-4 border-b border-stroke flex items-center gap-3">
          <div className="flex-1">
            <div className="font-semibold">错题复习模式</div>
            <div className="text-xs text-ink-muted mt-0.5">
              按「错误多 + 久未复习」优先排序 · 当前第 {Math.min(idx + 1, total)} / {total} 词
            </div>
            <ProgressBar
              className="mt-2 max-w-md"
              value={progressPct}
              max={100}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md hover:bg-surface-muted text-ink-muted"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {done && summary ? (
            <div className="max-w-xl mx-auto text-center py-12 space-y-4 animate-pop">
              <div className="text-5xl">🎉</div>
              <h2 className="text-2xl font-semibold">复习完成！</h2>
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="p-4 rounded-xl border border-stroke">
                  <div className="text-ink-muted text-xs">复习总数</div>
                  <div className="text-xl font-semibold">{summary.total}</div>
                </div>
                <div className="p-4 rounded-xl border border-stroke">
                  <div className="text-ink-muted text-xs">答对</div>
                  <div className="text-xl font-semibold text-success">{summary.correct}</div>
                </div>
                <div className="p-4 rounded-xl border border-stroke">
                  <div className="text-ink-muted text-xs">本轮攻克</div>
                  <div className="text-xl font-semibold text-brand">{summary.mastered}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 h-10 px-5 rounded-lg bg-brand text-white hover:opacity-90"
              >
                完成
              </button>
            </div>
          ) : record && root ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
                <aside className="lg:sticky lg:top-0">
                  <NavTree root={root} focusId={focusId} onJump={onJump} />
                </aside>
                <div>
                  {phase === 'browsing' && (
                    <>
                      <RecursivePanel
                        root={root}
                        onWordClick={onWordClick}
                        onCollapse={onCollapse}
                        focusNodeId={focusId}
                        onFocus={setFocusId}
                      />
                      {/* We need id prefix "review-node-" for jump. Patch by second pass below using custom ID? Simpler: re-render via DefinitionLine key override by injecting wrapper; actually simpler: add Wrapper mapping id here. */}
                      <IDRewrap root={root} />
                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            collapseForTest();
                            setPhase('testing');
                          }}
                          className="h-11 px-5 rounded-lg bg-brand text-white font-medium hover:opacity-90"
                        >
                          我已理解，开始自测
                        </button>
                      </div>
                    </>
                  )}
                  {phase === 'testing' && (
                    <div className="max-w-2xl mx-auto rounded-2xl border border-stroke p-5 sm:p-6">
                      <div className="text-sm text-ink-muted">请输入下面单词的中文意思</div>
                      <div className="font-serif-en text-3xl font-semibold mt-1">{record.word}</div>
                      <form
                        className="mt-5 flex flex-col sm:flex-row gap-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitCheck();
                        }}
                      >
                        <input
                          autoFocus
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder="你的理解…"
                          className="flex-1 h-11 px-3 rounded-lg bg-surface-muted border border-stroke outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                        />
                        <button
                          type="submit"
                          disabled={!userAnswer.trim()}
                          className="h-11 px-5 rounded-lg bg-brand text-white font-medium disabled:opacity-60 hover:opacity-90"
                        >
                          核对
                        </button>
                      </form>
                    </div>
                  )}
                  {phase === 'result' && result && (
                    <div className="max-w-2xl mx-auto space-y-4">
                      <div className="rounded-2xl border border-stroke p-5">
                        <div className="font-serif-en text-2xl font-semibold">{record.word}</div>
                        <ul className="mt-3 list-disc pl-5 space-y-1">
                          {root.chineseMeanings.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                      {result.mastered ? (
                        <ResultToast
                          kind="mastered"
                          title="恭喜！该词已攻克，移出错题库 🎉"
                        />
                      ) : result.ok ? (
                        <ResultToast kind="correct" title="回答正确！离攻克又近一步" />
                      ) : (
                        <ResultToast
                          kind="wrong"
                          title="答错，已记入错题"
                          desc={result.degraded ? '（语义服务降级，使用近似判定）' : undefined}
                        />
                      )}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={next}
                          className="h-10 px-5 rounded-lg bg-brand text-white hover:opacity-90"
                        >
                          {idx + 1 >= total ? '查看总结' : '下一个 →'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {err && <ResultToast kind="warn" title="小提示" desc={err} />}
            </div>
          ) : (
            <div className="text-ink-muted text-center py-20">加载中…</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 临时办法：在 DOM 中插入 id="review-node-${node.id}" 的锚点用于 NavTree 跳转 */
function IDRewrap({ root }: { root: WordNode }) {
  const list: WordNode[] = [];
  const walk = (n: WordNode) => {
    list.push(n);
    n.children.forEach(walk);
  };
  walk(root);
  const patchScript = () => {
    list.forEach((n) => {
      const old = document.getElementById(`node-${n.id}`);
      if (old && !document.getElementById(`review-node-${n.id}`)) {
        const a = document.createElement('span');
        a.id = `review-node-${n.id}`;
        a.style.position = 'absolute';
        old.style.position = 'relative';
        old.prepend(a);
      }
    });
  };
  // useEffect 方式
  return <PatchEffect apply={patchScript} deps={root.id + list.map((n) => n.id).join(',')} />;
}

function PatchEffect({ apply, deps }: { apply: () => void; deps: string }) {
  useEffect(() => {
    const t = setTimeout(apply, 30);
    return () => clearTimeout(t);
  }, [deps]);
  return null;
}

// duplicate helpers（避免循环依赖）
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
  const n = root.id === id ? updater(root) : root;
  return { ...n, children: n.children.map((c) => updateNode(c, id, updater)) };
}
```

> 小提示：上面 DefinitionLine 的 id 是 `node-${id}`；Review 跳转用的锚点我们通过 `IDRewrap` 组件额外注入 `review-node-${id}`，和 Lookup 页里的原生 id 分开互不干扰；可在后续优化中抽通用 RecursiveContainer，但本次为了快速交付保持最小改动。

- [ ] **Step 5: src/components/wrong-bank/WrongBankPage.tsx**

```tsx
import { useState } from 'react';
import StatsBanner from './StatsBanner';
import WrongWordTable from './WrongWordTable';
import ReviewModal from './ReviewModal';
import { useAppStore } from '@/store/useAppStore';
import { PlayCircle } from 'lucide-react';

export default function WrongBankPage() {
  const build = useAppStore((s) => s.buildReviewQueue);
  const startReview = useAppStore((s) => s.startReview);
  const closeReview = useAppStore((s) => s.closeReview);
  const session = useAppStore((s) => s.reviewSession);
  const [testingWord, setTestingWord] = useState<string | null>(null);

  const onStart = () => {
    const q = build();
    if (!q.length) {
      alert('暂无可复习的错题～先去查单词答错几个试试！');
      return;
    }
    startReview(q);
  };

  const onSingleTest = (word: string) => {
    // 复用复习模式，队列仅包含该词
    const one = useAppStore.getState().wrongWords.filter((w) => w.word === word);
    if (!one.length) return;
    startReview(one);
  };

  const pending = useAppStore((s) => s.wrongWords.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">错题库</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            答错的词会自动入库，连续答对 N 次后自动攻克（默认 3，可在设置中调整）
          </p>
        </div>
        <button
          type="button"
          onClick={onStart}
          disabled={pending === 0}
          className="h-11 px-5 rounded-lg bg-brand text-white font-medium disabled:opacity-60 hover:opacity-90 transition inline-flex items-center gap-2"
        >
          <PlayCircle size={18} /> 开始复习（{pending}）
        </button>
      </div>

      <StatsBanner />
      <WrongWordTable onSingleTest={onSingleTest} />

      {testingWord && (
        <div className="fixed bg-ink/40 inset-0 z-40" onClick={() => setTestingWord(null)} />
      )}
      {session && <ReviewModal onClose={closeReview} />}
    </div>
  );
}
```

---

## Task 8：设置页组件

**Files:**
- Create: `src/components/settings/SettingsPage.tsx`, `DataSourceSelect.tsx`, `OxfordApiConfig.tsx`,
  `LlmApiConfig.tsx`, `TargetCorrectSlider.tsx`, `DangerZone.tsx`

- [ ] **Step 1: src/components/settings/DataSourceSelect.tsx**

```tsx
import { useAppStore } from '@/store/useAppStore';
import type { DataSourceMode } from '@/types';
import { cn } from '@/utils/cn';

const options: { v: DataSourceMode; title: string; desc: string }[] = [
  {
    v: 'oxford_api_preferred',
    title: '牛津词典 API（优先）',
    desc: '优先调用官方 Oxford Dictionaries API 取释义与中文翻译，失败或未配置时自动回落 LLM。',
  },
  {
    v: 'llm_only',
    title: '仅 LLM（兜底模式）',
    desc: '完全通过 LLM 取"基于牛津词典原文"的释义与中文意思，无需申请 Oxford API Key。',
  },
];

export default function DataSourceSelect() {
  const mode = useAppStore((s) => s.settings.dataSource);
  const set = useAppStore((s) => s.setSettings);
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {options.map((o) => {
        const sel = mode === o.v;
        return (
          <button
            type="button"
            key={o.v}
            onClick={() => set({ dataSource: o.v })}
            className={cn(
              'text-left p-4 rounded-xl border transition',
              sel
                ? 'border-brand bg-brand-soft/40 ring-2 ring-brand/30'
                : 'border-stroke hover:bg-surface-muted',
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                  sel ? 'border-brand' : 'border-stroke',
                )}
              >
                {sel && <span className="w-2 h-2 rounded-full bg-brand" />}
              </span>
              <span className="font-medium text-ink">{o.title}</span>
            </div>
            <p className="text-sm text-ink-muted mt-2">{o.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: src/components/settings/OxfordApiConfig.tsx**

```tsx
import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Eye, EyeOff, ExternalLink } from 'lucide-react';

export default function OxfordApiConfig() {
  const s = useAppStore((st) => st.settings);
  const set = useAppStore((st) => st.setSettings);
  const [showK, setShowK] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-ink-muted">app_id</span>
          <div className="relative mt-1">
            <input
              value={s.oxfordAppId}
              onChange={(e) => set({ oxfordAppId: e.target.value })}
              type={showK ? 'text' : 'password'}
              className="w-full h-10 px-3 pr-10 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              placeholder="在 developer.oxforddictionaries.com 申请"
            />
            <button
              type="button"
              onClick={() => setShowK((x) => !x)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-surface-muted text-ink-muted"
            >
              {showK ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="text-sm text-ink-muted">app_key</span>
          <div className="relative mt-1">
            <input
              value={s.oxfordAppKey}
              onChange={(e) => set({ oxfordAppKey: e.target.value })}
              type={showPwd ? 'text' : 'password'}
              className="w-full h-10 px-3 pr-10 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPwd((x) => !x)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-surface-muted text-ink-muted"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
      </div>
      <label className="block">
        <span className="text-sm text-ink-muted">生产环境代理 Base URL（选填）</span>
        <input
          value={s.oxfordProxyBase}
          onChange={(e) => set({ oxfordProxyBase: e.target.value })}
          className="mt-1 w-full h-10 px-3 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          placeholder="如 https://<你的代理>/api/v2，开发环境可留空（已自带 /oxford 代理）"
        />
      </label>
      <a
        className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
        href="https://developer.oxforddictionaries.com"
        target="_blank"
        rel="noreferrer"
      >
        去 Oxford Dictionaries 申请 API <ExternalLink size={14} />
      </a>
    </div>
  );
}
```

- [ ] **Step 3: src/components/settings/LlmApiConfig.tsx**

```tsx
import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { llmPing } from '@/services/llmClient';
import { Check, Loader2, X } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';

export default function LlmApiConfig() {
  const s = useAppStore((st) => st.settings);
  const set = useAppStore((st) => st.setSettings);
  const [showK, setShowK] = useState(false);
  const [testing, setTesting] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);

  const test = async () => {
    setTesting(true);
    setOk(null);
    try {
      const res = await llmPing(s);
      setOk(res);
    } catch {
      setOk(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-sm text-ink-muted">Base URL</span>
          <input
            value={s.llmBaseUrl}
            onChange={(e) => set({ llmBaseUrl: e.target.value })}
            className="mt-1 w-full h-10 px-3 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            placeholder="https://api.openai.com/v1"
          />
        </label>
        <label className="block">
          <span className="text-sm text-ink-muted">模型</span>
          <input
            value={s.llmModel}
            onChange={(e) => set({ llmModel: e.target.value })}
            className="mt-1 w-full h-10 px-3 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            placeholder="gpt-4o-mini"
          />
        </label>
        <label className="block">
          <span className="text-sm text-ink-muted">API Key</span>
          <div className="relative mt-1">
            <input
              value={s.llmApiKey}
              onChange={(e) => set({ llmApiKey: e.target.value })}
              type={showK ? 'text' : 'password'}
              className="w-full h-10 px-3 pr-10 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              placeholder="sk-..."
            />
            <button
              type="button"
              onClick={() => setShowK((x) => !x)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-surface-muted text-ink-muted"
            >
              {showK ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={test}
          disabled={testing || !s.llmApiKey.trim() || !s.llmBaseUrl.trim()}
          className="h-10 px-4 rounded-md bg-brand text-white disabled:opacity-60 hover:opacity-90 transition inline-flex items-center gap-2"
        >
          {testing ? (
            <>
              <Loader2 size={16} className="animate-spin" /> 测试连接中…
            </>
          ) : (
            '测试连接'
          )}
        </button>
        {ok === true && (
          <span className="inline-flex items-center gap-1 text-success">
            <Check size={16} /> 连接正常
          </span>
        )}
        {ok === false && (
          <span className="inline-flex items-center gap-1 text-danger">
            <X size={16} /> 失败，请检查 Base URL / Key / 网络
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: src/components/settings/TargetCorrectSlider.tsx**

```tsx
import { useAppStore } from '@/store/useAppStore';

export default function TargetCorrectSlider() {
  const v = useAppStore((s) => s.settings.targetCorrect);
  const set = useAppStore((s) => s.setSettings);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">移出错题库所需连续答对次数</span>
        <span className="font-semibold text-brand">
          {v} 次{v === 1 ? '' : `（1–10）`}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={v}
        onChange={(e) => set({ targetCorrect: Number(e.target.value) })}
        className="w-full mt-3 accent-brand"
      />
      <p className="mt-2 text-sm text-ink-muted">
        连续答对 {v} 次后，该词会自动标记为 <b>已掌握</b> 并从错题库移出。
      </p>
    </div>
  );
}
```

- [ ] **Step 5: src/components/settings/DangerZone.tsx**

```tsx
import { Storage } from '@/services/storage';
import { AlertTriangle } from 'lucide-react';

export default function DangerZone() {
  const wipe = () => {
    const ok1 = confirm('⚠️ 真的要清空所有数据吗？\n（错题、已掌握、设置都会被删除！）');
    if (!ok1) return;
    const v = window.prompt('请输入 DELETE 确认：');
    if (v !== 'DELETE') return;
    Storage.resetAll();
    alert('已清空全部数据，页面将刷新。');
    location.reload();
  };
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-danger shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-danger">危险操作：清空所有数据</div>
          <p className="text-sm text-ink-muted mt-1">
            包含：错题库、已掌握、学习历史、全部设置。操作不可恢复！
          </p>
        </div>
        <button
          type="button"
          onClick={wipe}
          className="h-10 px-4 rounded-md bg-danger text-white hover:opacity-90"
        >
          清空所有数据
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: src/components/settings/SettingsPage.tsx**

```tsx
import DataSourceSelect from './DataSourceSelect';
import OxfordApiConfig from './OxfordApiConfig';
import LlmApiConfig from './LlmApiConfig';
import TargetCorrectSlider from './TargetCorrectSlider';
import DangerZone from './DangerZone';

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stroke bg-surface p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {desc && <p className="text-sm text-ink-muted mt-1">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold">设置</h1>
        <p className="text-sm text-ink-muted mt-1">
          所有设置和数据都保存在你本地浏览器，不会上传服务器。
        </p>
      </div>
      <Section
        title="数据源"
        desc="优先使用官方牛津 API 时准确性最高；未配置或失败时自动回落 LLM（兜底）。"
      >
        <DataSourceSelect />
      </Section>
      <Section
        title="Oxford Dictionaries API"
        desc="官方 API 每日有免费额度；开发期已通过 Vite dev server 的 /oxford 代理解决 CORS。"
      >
        <OxfordApiConfig />
      </Section>
      <Section
        title="LLM（必配）"
        desc="用于兜底的牛津释义和中文翻译，以及 100% 的语义判定。需要兼容 OpenAI Chat Completions 格式。"
      >
        <LlmApiConfig />
      </Section>
      <Section title="错题库阈值">
        <TargetCorrectSlider />
      </Section>
      <Section title="数据管理">
        <DangerZone />
      </Section>
    </div>
  );
}
```

---

## Task 9：安装依赖 + `tsc -b && vite build` 验证可构建

- [ ] **Step 1: 安装依赖**

在项目根目录执行（Windows PowerShell 5 兼容写法）：

```powershell
cd "C:\Users\邓\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a8eeb6529c1c42046805e1c"
npm install
```

期望输出：无错误，生成 `node_modules/`、`package-lock.json`。

- [ ] **Step 2: 类型检查 + 生产构建**

```powershell
npm run build
```

期望：`tsc -b` 无类型错误，`vite build` 完成后 `dist/` 目录生成 `index.html + assets/` 并提示 ✓ built in xxxms。

- [ ] **Step 3: 启动 dev server 做手动冒烟**

```powershell
npm run dev
```

打开 `http://localhost:5173/`：
1. 切到设置 → 填 LLM Key → 测试连接通过。
2. 切到查单词 → 输入 `ubiquitous` → 能看到释义；点其中 1-2 个 ≥3 字母的词 → 右侧缩进展开，左侧导航树同步出现层级。
3. 点"开始测试"→ 故意写错中文 → 看到红色 toast "已加入错题库"。
4. 切到"错题库"：新词条 1 次错误；"开始复习"：弹窗走流程 → 答对 → 连续答对进度前进；3 次后自动攻克 → 环形掌握率增加。
5. 设置页切换主题：亮色/深色立即切换。
6. 刷新页面 → 错题、已掌握、设置保留。

---

## 计划自检

1. **Spec 覆盖**：对照 §2-§9 的每个需求 → 都能对应到具体 Task；深色模式、Oxford / LLM 双策略、语义判定、错题库复习排序、艾宾浩斯近似权重、连续答对自动攻克、清空二次确认都已覆盖。
2. **占位符扫描**：所有步骤都给出完整代码；无 "TBD/后续补齐"。ReviewModal 里 "DefinitionLine id 前缀冲突" 的处理已明确写 `IDRewrap` 锚点补丁（可后续优化但不阻塞）。
3. **类型一致性**：`WrongWordRecord.targetCorrect`、`SourceMode` 枚举、`Phase` 状态名、`recordResult` 签名在 Task 3/4/6/7 完全一致。
4. **最小实现原则**：不引入 React Router / axios / 图表库（环形进度手画 SVG），包体最小化。

Plan complete and saved to `docs/superpowers/plans/2026-08-26-recursive-vocab-learning-plan.md`. 下面我将按 Task 顺序在当前会话中执行代码生成并在最后运行 `npm install && npm run build` 验证。
