# 递归式英文释义词汇学习软件 — 设计规格

> 日期：2026-08-26 | 目标：v1.0 交付
> 技术栈：React 18 + TypeScript 5 + Vite 5 + Tailwind CSS 3 + Zustand
> 数据：纯前端 localStorage 持久化

---

## 1. 产品理念

用英文解释英文，遇到不懂的词递归深挖直到完全理解，再回到原词自测中文意思。不直接展示中文翻译，逼迫用户用英文思维理解英文。答错自动入库、连续答对达标自动攻克。所有词义以 **Oxford Advanced Learner's Dictionary / Oxford 英汉双解** 为唯一权威来源。

---

## 2. 功能范围（v1.0）

### 已承诺必做
- 三个顶部 Tab：**查单词 / 错题库 / 设置**
- 递归释义浏览（可点击单词、无限层级、导航树、收起/展开、深度指示）
- 返回原词自测、LLM 语义判定、正确/错误动画反馈
- 答错自动入库、累计错误次数、最近错误时间、连续答对计数
- 错题库统计看板（总数 / 已攻克 / 待复习 / 掌握率环形进度）
- 错词列表：搜索、排序（错误次数、最近错误时间）、行内操作（重测 / 移出 / 删除）、批量操作
- 复习模式：艾宾浩斯风格优先顺序、进度条、复用主流程组件
- 设置页：数据源切换、Oxford API 配置、LLM API 配置（OpenAI 兼容默认模板）、移出错题库目标次数（1-10）、清空数据二次确认
- 深/浅主题切换（NavBar 按钮，默认跟随系统）

### 明确不做（v2 再考虑）
- 学习历史子标签
- CSV / JSON 导入导出
- 错题复习提醒横幅
- 多设备同步 / 云端存储

---

## 3. 架构方案 A（已确认）

```
┌─────────────────────────────────────────────┐
│ React 组件层（Pages / Features）             │
├─────────────────────────────────────────────┤
│ Zustand store（单一 store + 3 slices）       │
│  · settingsSlice  用户设置 + 主题持久化       │
│  · wordTreeSlice  查单词递归树 + 自测阶段     │
│  · wrongBankSlice 错题库 CRUD + 复习队列     │
├─────────────────────────────────────────────┤
│ Service 层（无 React 依赖，可单测）           │
│  · storage        localStorage 封装          │
│  · oxfordClient   Oxford Dictionaries API   │
│  · llmClient      OpenAI 兼容 chat + JSON    │
│  · wordFetcher    取义策略：Oxford→LLM 兜底  │
│  · semanticJudge  判定答案语义相符           │
├─────────────────────────────────────────────┤
│ Vite dev proxy  /oxford → od-api.oxford...  │
│ 直连 LLM Base URL（浏览器 CORS 通常支持）    │
└─────────────────────────────────────────────┘
```

分层规则：
1. `services/` 不得 import React / Zustand。
2. `store/` 只 import services，反向不允许。
3. 组件通过 selector 订阅 store 最小必要切片，避免无意义重渲染。
4. 所有持久化写入统一经过 `storage.set()`，未来替换 IndexedDB/云端只改这一模块。

---

## 4. 核心数据结构

```ts
export interface WordNode {
  id: string;               // 节点唯一 id（depth + word + 序号，用于 React key）
  word: string;             // 该单词
  englishDefinition: string;// 英文释义
  chineseMeanings: string[];// 牛津中文释义列表（查询时拿，自测时判定）
  children: WordNode[];     // 点击深挖生成的子节点
  expanded: boolean;        // 是否展开
  depth: number;            // 0 = 根节点
  parentId: string | null;  // 树导航用
  source: 'Oxford' | 'LLM'; // 释义来源，UI 显示 "📖 Oxford" 或 "🤖 LLM(Oxford)"
}

export interface WrongWordRecord {
  word: string;
  userWrongAnswers: string[];     // 历次错误答案（追加）
  correctAnswers: string[];       // 牛津中文释义
  wrongCount: number;             // 累计错误
  consecutiveCorrect: number;     // 连续答对
  targetCorrect: number;          // 攻克阈值（来自设置，冗余便于历史回放）
  firstWrongTime: number;         // ms
  lastWrongTime: number;          // ms
  lastReviewTime: number;         // ms（最近一次尝试）
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

export type DataSourceMode = 'oxford_api_preferred' | 'llm_only';

export interface Settings {
  dataSource: DataSourceMode;
  oxfordAppId: string;
  oxfordAppKey: string;
  llmApiKey: string;
  llmModel: string;        // 默认 "gpt-4o-mini"
  llmBaseUrl: string;      // 默认 "https://api.openai.com/v1"
  targetCorrect: number;   // 默认 3，范围 1-10
  theme: 'light' | 'dark' | 'system';
}

export interface AppStorageShape {
  wrongWords: WrongWordRecord[];
  masteredWords: MasteredWord[];
  learningHistory: LearningRecord[];
  settings: Settings;
  version: 1;              // 预留 schema 迁移
}
```

---

## 5. Service 层契约

### 5.1 storage
```ts
class Storage {
  static get<K extends keyof AppStorageShape>(k: K): AppStorageShape[K];
  static set<K extends keyof AppStorageShape>(k: K, v: AppStorageShape[K]): void;
  static remove(k: keyof AppStorageShape): void;
  static resetAll(): void;          // 危险区
  static ensureInitialized(): void; // 启动时：缺字段补默认，version 兼容
}
```
默认值：settings 按 4. 中的默认；数组字段 = `[]`；`version = 1`。

### 5.2 oxfordClient
基础 URL 在 dev 走 `/oxford/api/v2`（Vite 代理到 `https://od-api.oxforddictionaries.com/api/v2`），生产如用户设置 `OXFORD_PROXY_BASE`（可在设置里加一个选填字段 `oxfordProxyBase`）则走代理；否则直接浏览器直连并在失败时回落 LLM。

Header：`app_id`、`app_key`。

方法：
- `fetchEnglishDefinition(word: string): Promise<{definition: string; source:'Oxford'} | null>`
  - 调 `GET /entries/en-gb/{word}`；从 `results[].lexicalEntries[].entries[].senses[].definitions[]` 取 1-2 条拼接；失败或未配置返回 null。
- `fetchChineseMeanings(word: string): Promise<string[] | null>`
  - 调 `GET /translations/en/zh/{word}`；从 `results[].lexicalEntries[].entries[].senses[].translations[].text` 去重提取；失败返回 null。

### 5.3 llmClient
- `chatJson<T>(prompt: string, schema: ZodSchema<T>): Promise<T>`
  - 调 `POST {baseUrl}/chat/completions`，`response_format: {type:'json_object'}`；body 字段遵循 OpenAI 标准；解析 JSON 时用 Zod 强校验，失败抛错。
  - 超时 30s；401/403 显式提示"LLM API Key 错误或无权限"。

### 5.4 wordFetcher（取义策略）
```ts
interface FetchResult {
  englishDefinition: string;
  chineseMeanings: string[];
  source: 'Oxford' | 'LLM';
}
async function fetchWord(word: string, settings: Settings): Promise<FetchResult>;
```
策略：
1. 若 `settings.dataSource === 'oxford_api_preferred'` 且 app_id/app_key 非空 → 并行调用 `oxfordClient.fetchEnglishDefinition` + `fetchChineseMeanings`。
2. 如果两端都拿到结果 → 返回（source: 'Oxford'）。
3. 任何一端失败 / 超时 6s → 改用 LLM 兜底 Prompt：
   - 英文释义 prompt：`"请基于牛津高阶英语词典（Oxford Advanced Learner's Dictionary）原文，给出单词 '{word}' 的英文释义（1-2句）。不要在解释中使用该单词本身。返回 JSON: {\"definition\": string, \"source\": \"Oxford via LLM\"}"`
   - 中文 prompt：`"请基于牛津英汉双解词典，列出单词 '{word}' 的所有中文释义。严格返回 JSON 数组，如 [\"n. 意思1\", \"v. 意思2\"]"`
4. `dataSource === 'llm_only'` → 跳 1/2 直接走 3。

### 5.5 semanticJudge（必走 LLM）
```ts
async function judgeMatch(params: {
  word: string;
  userAnswer: string;
  correctAnswers: string[];
  settings: Settings;
}): Promise<boolean>;
```
Prompt：
```
用户对单词 '{word}' 给出的中文意思是："{userAnswer}"。
牛津英汉双解词典的正确中文释义列表：{correctAnswers_json}。
请判断用户答案是否与其中任一正确答案语义相符（允许近义、同义词、常见表述；但不是明显错位）。
只返回 "true" 或 "false"，不要输出任何其他内容。
```
实现上用 `llmClient.chat` 直接拿纯文本，`trim().toLowerCase() === 'true'` 判断。

> 本地会加一个兜底短路：若 `correctAnswers` 中任一字符串与用户答案的"去掉前后空格/标点"后完全相等 → 直接 true，省一次 LLM 调用。

---

## 6. Store 状态机（Zustand slices）

### 6.1 settingsSlice
```ts
type Self = {
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
};
```
- 初始化时 `Storage.get('settings')`；任何 `setSettings` 后立即 `Storage.set('settings', ...)`。
- 主题变更：切换 `document.documentElement.classList.toggle('dark')`（Tailwind darkMode: 'class'）。

### 6.2 wordTreeSlice
```ts
type Phase = 'idle' | 'loading' | 'browsing' | 'testing' | 'result';

type Self = {
  phase: Phase;
  rootWord: string | null;
  rootNode: WordNode | null;
  focusNodeId: string | null;   // 导航树高亮
  selfTest: {
    userAnswer: string;
    isCorrect: boolean | null;
  } | null;
  errorMsg: string | null;

  // 动作
  startLookup: (word: string) => Promise<void>;  // 查新词
  expandChild: (parentId: string, word: string) => Promise<void>;
  collapseChild: (nodeId: string) => void;
  setFocus: (nodeId: string | null) => void;
  collapseAllButRoot: () => void;  // 开始测试前自动执行
  enterTest: () => void;
  setUserAnswer: (v: string) => void;
  checkAnswer: () => Promise<void>;
  reset: () => void;
};
```
关键：`checkAnswer` 里调 `semanticJudge` 后要联动 `wrongBankSlice.recordResult`、写入 `learningHistory`、更新 `MasteredWord`。跨 slice 通信在 Zustand 里通过 `useAppStore.getState().xxx` 调用即可（无需 Context）。

### 6.3 wrongBankSlice
```ts
type Self = {
  wrongWords: WrongWordRecord[];
  masteredWords: MasteredWord[];
  learningHistory: LearningRecord[];

  // 错词 CRUD
  addOrUpdateWrong: (params: {word, wrongAnswer, correctAnswers: string[]}) => void;
  removeFromWrongBank: (word: string) => void;
  deleteRecord: (word: string) => void;
  batchDelete: (words: string[]) => void;
  batchRemove: (words: string[]) => void;

  // 测试后统一入口
  recordResult: (params: {
    word: string;
    correctAnswers: string[];
    userAnswer: string;
    isCorrect: boolean;
    targetCorrect: number;
  }) => void;

  // 复习队列
  buildReviewQueue: (limit?: number) => WrongWordRecord[];
  // 搜索/排序
  listView: (opts: {keyword: string; sort: 'wrongCount' | 'lastWrongTime'}) => WrongWordRecord[];
};
```

### 6.4 复习排序权重（艾宾浩斯近似）
`buildReviewQueue` 计算：
```
score = (wrongCount / maxCount) * 0.5
      + clamp(daysSinceLastWrong / 7, 0, 1) * 0.3
      + (1 - consecutiveCorrect / targetCorrect) * 0.2
```
按 score 降序取前 50 条，避免列表过大。

---

## 7. UI / 页面细则

### 7.1 公共
- 顶部 NavBar：Logo "🔁 RecurWords" + 三 Tab + 主题切换按钮。使用 `lucide-react` 图标库。
- 全局 `FirstRunGuide`：`settings.llmApiKey` 为空时查词页顶部渲染黄色引导卡片，按钮跳到设置页。
- 动画：展开/折叠用 Tailwind `transition-all` + max-height trick；结果 Toast 用 `animate-[fadeIn_.2s,bounce_.4s]`（自定义 keyframes 放入 index.css）。
- 深色模式：根节点加 `.dark` 类，所有颜色用 `bg-white dark:bg-zinc-900` 等 Tailwind 原子，关键 token（`--brand`、`--surface`）通过 CSS 变量在 `:root` / `.dark` 内覆盖，与可视化 mockup 一致。

### 7.2 查单词页（LookupPage）
- 顶部：`WordInput`（回车触发查询、防抖 200ms）+ 查词按钮。
- 主内容两栏：
  - 左栏 220–260px：`NavTree` 递归列表；点击 node `setFocus` 并滚动到对应 `DefinitionLine`（用 `id="node-${nodeId}"` + scrollIntoView）；深度≥4 时显示"已深入 X 层"强调色徽标。
  - 右栏：`RecursivePanel` 渲染 `rootNode`，用 `DefinitionLine` 逐个单词切分为 `[string, 'word'|'punct'|'ws']` token；`word` token 渲染为 `cursor-pointer hover:text-brand border-b border-dotted border-brand`。
- 点击单词 token → 若 parent 下已存在该子节点 → 仅切换 expanded；否则调 `expandChild(parentId, word)`，同时在 children 末尾新增节点并 expanded=true + focus。
- 收起按钮：每个 node 卡片右上角 `[ − ]`；点击 `collapseChild` 即把 expanded=false 并清空 children（为下一次展开拿新释义，避免陈旧缓存）。
- 测试流：
  1. "我已理解，开始测试" 按钮 → `enterTest`：`collapseAllButRoot` + phase='testing'，右栏仅显示 root 单词大号字体 + 输入框。
  2. `SelfTestCard`：输入框 `value=selfTest.userAnswer` 绑定 `setUserAnswer`；回车或按钮触发 `checkAnswer`。
  3. 结果页（phase='result'）：
     - 正确：绿色卡片 + ✓ + 中文释义列表 + "🎉 已掌握 / 连续答对 N/目标"，按钮"再来一个词"→`reset`。
     - 错误：红色卡片 + ✗ + "已加入错题库"徽标 + 正确中文释义列表，按钮"重试"→回到 testing、"再来一个词"→`reset`。

### 7.3 错题库页（WrongBankPage）
- `StatsBanner`：4 列数字卡（总/攻克/待复习/掌握率），第 4 列 SVG 环形进度（viewBox 120，r=46，stroke-dasharray = 2πr，`dashoffset = 2πr*(1-rate)`）。
- 列表工具栏：搜索框（debounce 200ms，按 `word` 模糊包含）、排序下拉（错误次数降序 / 最近错误时间降序）、`[ 开始复习 ]`、`[ 全选 ]`、`[ 批量删除 ]` / `[ 批量移出 ]`。
- 表格每行：单词、徽章（错误次数 红色 / ≥3 深紫）、连续答对进度条（consec/target × 宽度）+ 文本、最近错误时间相对格式（`utils/text.ts formatRelative(ts)`）、操作按钮组。
- `ReviewModal`：对话框内复用 `RecursivePanel + NavTree + SelfTestCard` 流程，只是 phase 变化不影响主查词页。复习一题结束后按 queue 跳到下一题，或"跳过"。顶部进度条：`X / Y`。最后一题结束时展示小总结（"本次复习 X 题，答对 Y，错 Z，3 个词已攻克 🎉"）。

### 7.4 设置页（SettingsPage）
- `DataSourceSelect`：Radio 两选项，切换后实时保存。
- `OxfordApiConfig`：两个 password 输入框（眼睛按钮切换明文），下方保存提示 + "去申请 → https://developer.oxforddictionaries.com" 外链。并提供一个选填字段 "生产环境代理 Base"（oxfordProxyBase，默认空；有值时 oxfordClient 用该 URL 替代 `/oxford`）。
- `LlmApiConfig`：Base URL / Model / API Key。底部"测试连接"按钮（发一条 `say hi`，显示 OK/错误）。
- `TargetCorrectSlider`：range 1-10，下方动态展示"连续答对 N 次后自动攻克"。
- `DangerZone`：`[ 清空所有数据 ]` 红色按钮。点击后弹出原生 confirm 对话框，二次确认后再弹"输入 DELETE 确认"输入框，二者都过才执行 `storage.resetAll()` 并强制 reload 页面（保险）。

---

## 8. 关键交互与错误处理

1. **LLM 未配置时**：查词 → 顶部横幅提示配置；点击 `settings.llmApiKey.trim().length === 0` 时，`wordFetcher.fetchWord` 直接 throw 友好错误文案。
2. **Oxford API 403 / 500**：错误记录到 console，自动回落 LLM，并在释义卡片 source 显示 "📖 Oxford via LLM"。
3. **释义中非常用词（停用词 / 标点 / 数字）不可点**：`utils/text.ts tokenize` 时过滤 length≤2 的 token、纯数字；标点保留但不加点击。
4. **单词不存在**（404）：在查词框下方显示红色错误条，不改变 rootNode。
5. **localStorage 满（QuotaExceededError）**：`Storage.set` 捕获 → 弹出"本地存储已满，请在设置中清空历史或删除部分错题"通知（用 React Toast `ResultToast` 样式变体）。
6. **语义判定失败（LLM 抛错）**：自动降级为"字符串精确包含匹配"，并在结果区显示"⚠️ 语义服务暂不可用，已使用近似判定"。

---

## 9. 目录结构

```
recursive-vocab/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types/index.ts
    ├── services/
    │   ├── storage.ts
    │   ├── oxfordClient.ts
    │   ├── llmClient.ts
    │   ├── wordFetcher.ts
    │   └── semanticJudge.ts
    ├── store/useAppStore.ts
    ├── components/
    │   ├── layout/NavBar.tsx
    │   ├── layout/FirstRunGuide.tsx
    │   ├── layout/ResultToast.tsx
    │   ├── lookup/LookupPage.tsx
    │   ├── lookup/WordInput.tsx
    │   ├── lookup/RecursivePanel.tsx
    │   ├── lookup/DefinitionLine.tsx
    │   ├── lookup/NavTree.tsx
    │   ├── lookup/DepthIndicator.tsx
    │   ├── lookup/SelfTestCard.tsx
    │   ├── wrong-bank/WrongBankPage.tsx
    │   ├── wrong-bank/StatsBanner.tsx
    │   ├── wrong-bank/WrongWordTable.tsx
    │   ├── wrong-bank/ReviewModal.tsx
    │   ├── wrong-bank/ProgressBar.tsx
    │   └── settings/
    │       ├── SettingsPage.tsx
    │       ├── DataSourceSelect.tsx
    │       ├── OxfordApiConfig.tsx
    │       ├── LlmApiConfig.tsx
    │       ├── TargetCorrectSlider.tsx
    │       └── DangerZone.tsx
    └── utils/
        ├── text.ts
        ├── cn.ts
        └── zodSchemas.ts
```

依赖：`react@18 react-dom@18 zustand zod lucide-react clsx tailwind-merge` （dev: vite、typescript、@vitejs/plugin-react、tailwindcss、postcss、autoprefixer、@types/react…）。

---

## 10. 验收 Checklist（v1.0 交付）

- [x] `npm install && npm run dev` 启动无报错。
- [x] 设置页填入 LLM API Key（OpenAI 兼容）后，输入英文单词可在 5s 内看到英文释义，source 徽章正确显示。
- [x] 点击释义中任意 ≥3 字母单词 → 下方嵌套展开第二层；可继续点击至 ≥3 层；导航树同步高亮；点击导航节点可跳转到对应卡片。
- [x] "我已理解，开始测试"→ 输入中文 → 核对后正确/错误反馈正确；错误自动写入错题库，计数 +1，最近时间更新。
- [x] 错题库表格可搜索、排序；行操作单条删除 / 移出 / 重测；批量操作可删除 2+ 条。
- [x] 复习模式：开始复习 → 队列按"错误多 & 最久未复习"优先；答对一题连续数 +1；答错归零；达标自动移出，顶部"攻克"数 +1。
- [x] 设置页主题切换立即生效（深色时页面整体切换到深色调且不刺眼）。
- [x] 清空所有数据 → 二次确认后错词 / 掌握 / 设置全部归零。
- [x] 刷新后错词、掌握、设置全部保留（localStorage 持久化）。
- [x] Oxford API 未填 Key / 填错 Key → 自动回落 LLM，且 UI 显示 "📖 Oxford via LLM"。
