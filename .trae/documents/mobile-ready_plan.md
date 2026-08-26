# 手机端可用化改造方案

## 需求理解
用户希望已完成的「递归式英文词汇学习（React + Vite）」能在手机上使用。对应三层目标：
1. **日常访问**：手机浏览器可访问开发/构建后的网页（必须保证 LAN 可达 + viewport 正常 + 交互可点击）。
2. **操作体验**：移动端响应式布局（底部 Tab Bar / 触摸友好按钮 / 虚拟键盘避让 / 表格与 Modal 适配）。
3. **原生感 + 离线**：支持 PWA「添加到主屏幕」像 App 一样启动，构建后的资源通过 Service Worker 预缓存，断网也能打开（LLM/Oxford 外部请求仍需联网，这是业务特性）。

不引入原生壳（Capacitor / Cordova / Android SDK），避免对开发环境提新要求；未来需要 APK 可在此基础上升级。

## 仓库调研结论
- 项目已具备响应式底子（Tailwind + 语义化尺寸），但 `NavBar` 是顶部水平 Tab，窄屏下 Tab 文字会拥挤；
- `index.html` viewport 缺 `viewport-fit=cover`、`theme-color`、`apple-mobile-web-app-*` 等 iOS PWA 元信息；
- `index.css` 缺安全区域、触摸高亮、-webkit-tap-highlight-color、body 高度防止 iOS 回弹白屏；
- `vite.config.ts` server 只监听 localhost，手机同 WiFi 无法访问；
- 没有 PWA manifest、图标、Service Worker；
- `WrongWordTable` 的表格在手机上横向滚动体验差，`ReviewModal` 的 2 列布局在手机上会换行但缺顶部导航树折叠、底部安全区；
- 部分按钮 16px 图标 + 10px padding 小于 44×44 触摸目标。

## 依赖与考虑
- 新增依赖：`vite-plugin-pwa`（~0.20 兼容 Vite 5）。
- 图标：为了避免「生成 PNG 脚本」老路，用文本 SVG 作为最小集 + 可替换 PNG 路径；manifest 的 icons 会引用 SVG（现代 iOS/Chrome 均支持），用户后补 PNG 直接覆盖即可。
- 不引入原生壳意味着：必须指导用户把手机连到同一 WiFi，并通过本机 IP（如 192.168.x.x:5173）访问 dev server；或直接把 dist 丢到任意静态托管（GitHub Pages / Vercel / 内网 http-server）。
- Windows 上本机 IP 通常可用 `ipconfig` 的 IPv4 拿到；Vite 需 `--host 0.0.0.0` 监听所有网卡。
- PWA 的 Service Worker 仅在 https 或 localhost 生效；开发期通过 localhost PWA 设置面板预览；手机端建议先用 `npm run build && npm run preview -- --host` 走 LAN + https 反向代理/托管来真正体验"可安装"。

## 变更清单（按依赖顺序）

1. **package.json**
   - devDependencies 新增 `vite-plugin-pwa: ^0.20.0`；
   - scripts 新增：`dev:mobile`（等价于 `vite --host 0.0.0.0`）、`preview:mobile`（`vite preview --host 0.0.0.0`）。

2. **vite.config.ts**
   - 导入并挂载 `VitePWA`：
     - manifest：name/short_name「RecurWords」、start_url `/`、display `standalone`、background_color 同 --surface、theme_color 同 --brand、orientation `portrait-primary`、icons 引用 public 下 SVG；
     - workbox.globPatterns 收敛到 `**/*.{html,js,css,svg,png,ico,woff2}`，避免预缓存任何 API 数据；
     - registerType `autoUpdate`，减少用户手动 reload；
   - server.host 与 preview.host 默认化（脚本传参 + 配置兜底 `0.0.0.0`），保留 `/oxford` 代理。

3. **index.html**
   - `<meta name="viewport">` 追加 `viewport-fit=cover, maximum-scale=1, user-scalable=no`（避免 iOS 放大、全面屏刘海安全区域生效）；
   - 新增 `theme-color`（亮/暗各一份，用 media 区分）、`apple-mobile-web-app-capable`、`apple-mobile-web-app-status-bar-style`、`apple-mobile-web-app-title`、`apple-touch-icon` 指向 `/icon-192.svg`；
   - 在 `<head>` 末尾补 `<link rel="manifest" href="/manifest.webmanifest">`（vite-plugin-pwa 默认生成，不写也 OK，但显式写可让 iOS 更早识别）。

4. **public 目录新增资源（public/）**
   - `icon.svg`：144×144 文本 SVG，主色紫，内容 🔁 图标 + R 字标，作为 favicon / 通用图标。
   - `icon-192.svg`、`icon-512.svg`：相同风格 192/512 尺寸，用于 PWA 安装图标。
   - 全部使用可回退命名；manifest 中引用 SVG；用户后补 PNG 只需同名替换即可，无需改代码。

5. **src/index.css**
   - 补 `:root` 里的安全区域变量占位、`body` 的 `-webkit-tap-highlight-color: transparent`、`touch-action: manipulation`、`overscroll-behavior: none`（iOS 侧滑不带动页面）；
   - 把 `html,body,#root { height:100% }` 改为 `min-height: 100dvh`（动态视口，兼容 iOS Safari 地址栏缩放），并在底部安全区补 `padding-bottom: env(safe-area-inset-bottom, 0)` 到 main；
   - 新增 `.min-safe-pb` 工具类。

6. **tailwind.config.js**
   - extend `height: { screen: '100dvh' }`；
   - extend `minHeight: { screen: '100dvh' }`；
   - extend `padding: { 'safe-bottom': 'env(safe-area-inset-bottom, 0px)' }`。

7. **src/App.tsx**
   - 顶部 `<main>` 补 `pb-safe-bottom`；
   - 在手机视口下底部固定的「移动端 Tab Bar」只在窄屏时显示，宽屏仍显示顶部 NavBar：通过 `useMediaQuery`（不引入新库，直接用 `window.matchMedia` 写 3 行 hook）切换导航方式；或把 NavBar 内部直接响应式：
   - 简单稳健做法：**NavBar 顶部保留品牌 + 主题切换**，把 3 个 Tab（查单词/错题库/设置）在 `md` 以下挪到底部固定栏，高度 56px，图标尺寸 20，标签在图标下方；`main` 额外加 `pb-16`（+ safe）避免底部遮挡。

8. **src/components/layout/NavBar.tsx**
   - 改造为：顶部保留 Logo + 主题按钮；在 `md` 以下不渲染 Tab 行，返回一个 `BottomNav` 插槽由 App 根渲染，避免 CSS sticky 与 bottom fixed 冲突。
   - 更简洁：直接在 NavBar 里渲染两个 `<nav>`，用 `hidden md:flex` / `md:hidden fixed bottom-0 left-0 right-0 ...` 分层，顶部 nav 用 `md:flex`，底部 nav 用 `md:hidden`。
   - 所有可点击元素最小 44×44 触摸目标（`p-2.5` + `min-w-11 h-11`）。

9. **src/components/wrong-bank/WrongWordTable.tsx**
   - 表格外容器补 `overflow-x-auto`；
   - 列宽简化：手机端只留「单词 / 错误数 / 进度 / 操作」四列（用 `hidden sm:table-cell` 隐藏"最近错误"描述）；
   - 操作按钮改为 3 个竖排图标列，每个 44×44。

10. **src/components/wrong-bank/ReviewModal.tsx**
    - 外层容器改为 `max-h-[100dvh]` 并补 `pb-safe-bottom`；
    - 移动端（lg 以下）NavTree 从左侧栏改为页面顶部可折叠抽屉（默认折叠，按钮「导航树 🧭」，展开 overlay 或内联 accordion），避免竖屏上 240px 被挤成 100% 浪费首屏；
    - "开始自测 / 核对 / 下一个"按钮高度统一 48px，`w-full` 在窄屏时铺满。

11. **src/components/settings/LlmApiConfig.tsx / OxfordApiConfig.tsx**
    - 三列布局在手机下改为单列（已用 `grid sm:grid-cols-3 gap-3` 基本 OK，仅需把 h-10 改成 h-12 方便触摸输入）。

12. **src/components/lookup/DefinitionLine.tsx / RecursivePanel.tsx**
    - 可点击单词按钮（蓝色带下划线）最小高度 28，`padding-y: 2px`，确保可点击。

13. **src/components/lookup/LookupPage.tsx**
    - NavTree 侧栏在 lg 以下改为顶部折叠面板（和 ReviewModal 同样的"导航树 🧭"展开按钮），避免窄屏上左栏换行导致内容顺序奇怪。

14. **首次使用引导 FirstRunGuide**
    - 引导文案最后补一句「手机可点「添加到主屏幕」像 App 一样使用」。

## 实施步骤（按依赖）
1. 改 package.json（加 pwa 依赖与 mobile scripts）。
2. 改 vite.config.ts（host + VitePWA）。
3. 改 index.html（meta + icon links + theme-color）。
4. 创建 public/icon*.svg。
5. 改 index.css + tailwind.config.js（触摸/视口/安全区）。
6. 改 NavBar（顶部/底部双形态）。
7. 改 App（main 补底部内边距）。
8. 改 LookupPage、ReviewModal 的 NavTree 移动端折叠。
9. 改 WrongWordTable 列的响应式隐藏、按钮尺寸。
10. 统一 Settings / 自测卡片的输入/按钮最小触摸高度。

## 验证
**A. 桌面快速自检**（Node LTS 装好后）
- `npm install && npm run dev:mobile`
- 访问 http://localhost:5173 → F12 切 iPhone 尺寸
  - 查单词页：底部 Tab Bar 出现，顶部 NavTree 有折叠按钮，点击展开。
  - 定义内单词可点击展开下一级，无横向滚动条。
  - 「开始测试」按钮可按。
  - 错题库："最近错误"列隐藏；表格横滑。
  - 设置：3 列变 1 列。

**B. 手机真实访问**
- PC 执行 `ipconfig`，找到 Wireless LAN IPv4（如 192.168.1.10）。
- 手机连同一 WiFi → 打开 `http://192.168.1.10:5173`。
- 操作：查词、展开、自测、错题列表、设置修改。
- iOS Safari：分享 → 添加到主屏幕 → 回桌面打开，全屏 standalone 运行，状态栏颜色为品牌紫。

**C. PWA 离线**
- `npm run build && npm run preview:mobile`
- 手机用 https 托管或同一台局域网 https 代理访问，访问一次后切飞行模式，再次打开，页面应正常呈现（外部 API 调用失败不阻塞 UI）。

## 风险与处理
- **风险 1：LAN 访问不到** → 处理：Windows Defender 防火墙放行 node.exe（5173 端口）；或用 `npm run build` 后把 dist 上传任意静态托管（零网络配置）。
- **风险 2：iOS Safari 在非 https/非 localhost 下 Service Worker 不注册** → 处理：手机端要"可安装 + 离线"请走 https 托管；dev 期只验证响应式与功能，不强求安装。
- **风险 3：SVG 图标被老系统拒绝** → 处理：manifest 预留 192/512 PNG 同名位，用户放 PNG 覆盖即可生效，无需改代码。
- **风险 4：安装后外部 API 跨域（CORS）** → 处理：开发期 /oxford 代理只对 dev server 生效；生产部署 Oxford 必须在「设置」里填 `oxfordProxyBase` 或改用 LLM 兜底模式。
