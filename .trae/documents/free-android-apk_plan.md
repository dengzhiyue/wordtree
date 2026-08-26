# 免费产出 Android APK（分享给朋友安装）实施计划

## 需求确认
用户选择「推荐 B · 只给安卓朋友用的 APK」，并明确要求 **全程免费**。

## 研究结论（可行性与免费依据）
- **Capacitor（MIT）/Android SDK（免费）/debug 签名（免费）/GitHub Actions 每月 2000 min Ubuntu runner（免费）/个人 GitHub 仓库（免费）** → 五个环节全免费，整条链路可以做到 0 元。
- 给朋友 APK 不需要上架应用商店、无需 Google Play 开发者 $25、无需签名证书购买：用 Android SDK 默认 `debug.keystore` 签名即可；朋友安装时开「允许未知来源」就能装。
- 主路线选 **GitHub Actions 云打包（路线 Y）**，不要求本地装 10GB Android Studio；规避了 1029118 案例里最常失败的「本地 SDK 路径配置 / Gradle 首次同步卡住」。
- 备选路线 **本地 Android Studio 打包（路线 X）** 只以文档形式放入仓库 README，作为想完全离线的用户可走的路径。
- 当前仓库的 Vite build 产物目录是 `dist/`（Vite 默认），已具备移动端响应式与 PWA Service Worker；Capacitor 把 `dist/` 拷贝到安卓 assets 后用系统 WebView 渲染，UI/体验和 PWA 主屏幕版基本一致。

## 文件与模块变更
### 新增依赖
- `package.json` devDependencies 新增：
  - `@capacitor/cli: ^6.0.0` —— Capacitor 命令行工具（cap init / add / sync / build）
  - `@capacitor/core: ^6.0.0` —— JS 运行时桥接（状态栏样式等 API）
  - `@capacitor/android: ^6.0.0` —— 安卓原生平台包
  - 可选加 1 个 `@capacitor/status-bar: ^6.0.0`（仅需 2 行让手机状态栏颜色配品牌紫，体积可忽略）

### 新增配置文件
- `capacitor.config.ts`（或等价 .ts）：`appId = com.recurwords.app`、`appName = RecurWords`、`webDir = dist`、`server.androidScheme = https`（避免 localStorage/cookie 在 http 下降级）、`backgroundColor` 匹配主题。
- `.gitignore` 补充：`android/.gradle/`、`android/build/`、`android/**/build/`、`*.log`、`local.properties`（本地 SDK 路径不入库）。
- **GitHub Actions 云打包工作流**：`.github/workflows/build-apk.yml`
  - Trigger：`push` 到 main/master 或手动 `workflow_dispatch`。
  - Runner：`ubuntu-latest`。
  - 步骤：checkout → setup node 20 → npm ci → `npm run build`（Vite 产物 dist）→ 安装 JDK 17 Temurin → 执行 `npx cap sync android`（注意第一次会补 android/ 吗？策略：**把 android/ 原生工程骨架一起提交入库**，避免 cap add 需要 GUI 确认/交互失败）→ 用 `gradle wrapper` 执行 `./gradlew assembleDebug`（或用 `ionic cap build android --no-open` 等价命令）→ `upload-artifact@v4` 上传 `android/app/build/outputs/apk/debug/*.apk`，名 `recurwords-debug-apk`、保留 30 天。

### 生成并提交安卓原生项目骨架（android/）
- `npx cap add android` 会生成 `android/` 整棵 Gradle 工程（`settings.gradle`、`app/build.gradle`、`AndroidManifest.xml`、`MainActivity.java`、`gradle/wrapper/gradle-wrapper.jar`、`gradlew.bat` 等）。
- **全部提交入库**（除上面 gitignore 掉的 build/.gradle/local.properties），这样 Actions runner 上不需要重复 `cap add android`，只需 `cap copy + cap sync`，减少失败点。
- 关键原生配置点（要写清、避免 1029118 同款坑）：
  - `AndroidManifest.xml`：`package="com.recurwords.app"`、`minSdkVersion 24`（覆盖 98% 安卓机，安卓 7+ 起）、`targetSdkVersion 34`、`usesCleartextTraffic=false`（已用 https scheme，不需要明文）、`theme` 设置为 `@android:style/Theme.DeviceDefault.Light.NoActionBar`、启动图标指向 Capacitor 默认的 ic_launcher，以后我们再把 PNG 图标丢进去替换。
  - `res/values/themes.xml` 设 `statusBarColor = #7c3aed`（品牌紫）、`windowLightStatusBar` 按亮暗自动，或者在运行时用 status-bar 插件调用 JS 一行配置。
  - `gradle/wrapper/gradle-wrapper.properties` 用 Gradle 8.7 稳定版；`com.android.tools.build:gradle 8.5.2`（与 AGP 版本对齐，别出"版本不兼容 Gradle JDK17"这种经典坑）。
  - JDK 锁 17 （AGP 8.x 要求 JDK 17）。

### 图标 & 启动画面（Capacitor 安卓工程里的资源）
- 现在我们已经有 3 张 SVG，但 Android 原生启动桌面图标需要 PNG（mipmap-anydpi-v26 支持自适应图标 XML，可引用 SVG 太麻烦）。**免费策略**：
  - 在 `android/app/src/main/res/` 下写一套**自适应图标 XML**（`mipmap-anydpi-v26/ic_launcher.xml` + `ic_launcher_round.xml`），`foreground` 直接引用一个放在 `drawable/` 里的 **vector drawable XML**（我手写一个和我们 SVG 一致的紫底 + R 字的矢量 xml，不依赖图片），`background` 设为 brand 纯色。
  - 这样不用生成任何 PNG 图标也能在新安卓（API 26+，我们 minSdk=24，但任何 26+ 机显示自适应、24-25 系统会用 fallback 圆形单色图或提前退到矢量 PNG——我再放一张 512 PNG 作为保险，免费生成的话用代码里 `<vector>` 再做一个普通 mipmap-hdpi 位图是不需要外部工具的，但更稳妥是：我把 vector drawable XML 做好就行，现代机 100% 用自适应）。
- 如果你后续想换成更专业的图标，只要把 SVG/PNG 丢进 `assets/` 用 `npx capacitor-assets generate`（官方免费 asset 工具）一键生成所有尺寸，不需要我再写。

### 小改动让壳子体验更像 App
- `src/main.tsx`（或新建 `src/mobile.tsx` 并在 App 启动时调用一次）：
  - 当 `Capacitor.isNativePlatform()` 为 true，调用 `StatusBar.setBackgroundColor({ color: '#7c3aed' })` 并设 Style.Default，让状态栏颜色匹配品牌。
  - 如果浏览器（非原生）则不调，不影响 Web/PWA。
- `index.html` 已有 `theme-color`，继续保留。

### 新增用户指引（README.md 中新增 §「免费打安卓 APK 给朋友装」）
不单独建文档（遵守"非必要不建 md"的规则，但 README 是项目入口可以加章节）。写清楚：
1. **如何用 GitHub Actions 免费打包（推荐）**：注册 GitHub → `git init + commit + push` → 仓库 Settings → Actions Read&Write 打开（默认就有，安全起见写一下）→ 等 2-3 分钟 → Actions 最新 run → Artifacts 下载 recurwords-debug-apk.zip → 解压得到 `app-debug.apk`。
2. **如何发给朋友**：微信/QQ/网盘把 APK 发过去；朋友手机打开文件管理器 → 点 apk → 首次系统提示"未知来源"，允许本应用来源即可安装；装完桌面有 RecurWords 图标，点开直接用。
3. **数据存在哪里**：APK 内置 WebView 的 localStorage，每个朋友自己的数据在自己手机里，不共享；LLM/Oxford Key 每个朋友要自己在 App 的"设置"里填（或我们预置共享 Key——不推荐预置共享 Key，会被刷爆；建议 README 里说明让朋友各自填个人 Key，这是免费策略）。
4. **备选：本地 Android Studio 打包**：简述装 Studio → 配 SDK → `npm ci → npm run build → npx cap sync → npx cap open android` → Studio 里 Build → Build APK(s) → 路径说明。
5. **常见问题**：
   - 朋友装不上"解析包失败"：minSdk 24 要求安卓 7+，手机系统太老；或 APK 不完整（重新下载）。
   - 首次安装提示"风险提示"：因为 debug 签名不是平台签名，点「继续安装/仍然安装」即可，不会影响使用。
   - 访问 LLM 或牛津失败：APK 不再有 Vite `/oxford` 代理！在「设置」里要填 `oxfordProxyBase` 或直接用 LLM 兜底模式（这点和 PWA 托管时一致，必须强调）。

## 实施步骤（依赖顺序）
1. 改 `package.json`：加入 Capacitor 三件套依赖 + 脚本：
   - `cap:init`（仅第一次本地跑一下）、`cap:sync`、`cap:android:build` 三条脚本，方便本地派。
2. 生成 `capacitor.config.ts`（手工写好），配置 appId / appName / webDir=dist / androidScheme=https / backgroundColor。
3. 扩充 `.gitignore`：android 构建产物、local.properties。
4. **用一次 `npx cap add android --npm-client=npm`**（Node 装好后执行），产出 `android/` 原生工程；然后人工检查：
   - `build.gradle`（项目级）AGP 版本、Gradle wrapper 版本对齐。
   - `app/build.gradle`：`minSdk 24`、`targetSdk 34`、`versionCode 1`、`versionName "1.0.0"`、debug 用默认 `debug.keystore`（不用改）。
   - `AndroidManifest.xml`：包名、权限默认够（INTERNET + ACCESS_NETWORK_STATE 已由 Capacitor 写入）。
5. 在 `android/app/src/main/res/` 手写 **自适应图标 XML** + vector drawable 前景图（紫色渐变背景 + R 字矢量路径），替换默认 Capacitor 机器人的 `ic_launcher`。
6. 改入口 JS：当 Capacitor 原生壳内运行时调用 StatusBar 插件设置品牌紫背景。
7. 创建 `.github/workflows/build-apk.yml`，按照上一节描述的工作流写全，包括 JDK17、Node20、gradle 命令、上传 Artifact；并在 workflow 里执行 Gradle 之前 `chmod +x gradlew`（Ubuntu runner 里执行权限经常没带）。
8. README.md 新增「免费打安卓 APK 给朋友装」章节，把 4 条操作 + 常见问题写全。
9. 本地执行 `npm run build` 一次，确认 dist 生成；再 `npx cap copy android` 不报错（验证 webDir 路径正确）。
10. 把变更说明交付给你，你下一步执行 `git push` 到 GitHub → 等 Actions → 下载 APK → 发给朋友。

## 依赖与考虑
- **Node.js LTS 20** 必须先安装（已经和你提过，前几轮因 PATH 缺失没跑通 npm install）；Node 装好后执行 `npm install` 会装 Capacitor 三件套。
- `cap add android` 命令本身需要 Node，但不会下载 Android SDK（下载 SDK 只有真正执行 Gradle assembleDebug 时才会发生）。**云打包路线把这一步全放在 GitHub runner**，你电脑不碰 Android SDK/Gradle 下载，极大节省环境准备时间。
- 由于 PWA Service Worker 在 WebView 里意义不大（资产已经是本地），Capacitor 默认会把 `dist/` 拷贝到 `android/app/src/main/assets/public/` 打包进 APK，体积约几十 MB（主要是 JS 包很小，Capacitor 原生运行库 5-10 MB），很适合微信发送。
- 免费策略必须强调：APK 内**不内置任何 API Key**（避免被抓包盗刷）。README 中"朋友怎么用"要写：安装后首次打开 → 设置 → 填自己的 LLM Base URL + Key；如果朋友也有 Oxford Key 顺便填，否则走兜底模式。
- 避免 1029118 失败教训：**绝不承诺「直接装到手机」**。交付的是「app-debug.apk 文件」+ 「朋友点文件安装」的操作说明。我们不碰 ADB。
- AndroidManifest 权限保持最小：INTERNET + ACCESS_NETWORK_STATE（Capacitor 默认已带）。因为用户输入的 Key 存本地，没有文件 I/O，不需要存储权限。
- 关于 `cleartext`：生产里一定走 https；朋友的 LLM/oxfordProxyBase 如果是自家内网 http 且需要访问，在 `network_security_config.xml` 加一个 `domain-config cleartextTrafficPermitted=true` 对特定域名开白——本次我们先默认 https，等用户反馈需要再补，避免过度放宽。

## 验证（每一步必须过）
1. `npm install && npm run build` 成功，`dist/` 目录存在，PWA 的 manifest/service worker 也在 dist/。
2. `npx cap copy android` 成功：把 dist 复制进 android assets。
3. GitHub Actions 工作流在 Ubuntu runner 上 **完整跑通**，Artifacts 中出现 `recurwords-debug-apk.zip`、解压后有 `app-debug.apk`（5 MB 以上合理大小）。
4. 让任意一台安卓 7+ 真机安装 `app-debug.apk`：
   - 首次开屏出现 RecurWords 图标；
   - 底部 Tab Bar 正常、触摸点按无遗漏；
   - 进入设置、填入 LLM Key → 回到查词 → 输入单词 → 出释义；
   - 关闭 App 再打开 → 设置和错题仍在（证明 localStorage 持久化 OK）。
5. 冷启动/后台切回无白屏。

## 风险与处理
| 风险 | 处理/回退 |
|---|---|
| GitHub Actions 首次 push 没触发（仓库 Settings → Actions 被禁用） | README 写：Settings → Actions → General → "Allow all actions and reusable workflows"。 |
| GitHub Actions 上传 Artifact 失败（Token 权限不够） | 工作流顶层加 `permissions: contents: read + actions: write`（或在仓库 Settings → Actions → Workflow permissions 选 "Read and write permissions"）。 |
| Gradle 构建因为"AGP 版本和 JDK 不兼容"失败 | 显式写死 AGP 8.5.2 + Gradle 8.7 + JDK 17 Temurin（setup-java action 指定 distribution: 'temurin', java-version: 17）。 |
| Actions 第一次 assembleDebug 因为下载 Maven 依赖超时（国内镜像慢，GitHub 在美国基本没这问题，但万一） | 加 40 分钟 timeout-minutes；或在 gradle.properties 里配置 `org.gradle.jvmargs=-Xmx4096m` + `org.gradle.caching=true` + `org.gradle.parallel=true`，加速后续第二次打包。 |
| 朋友反馈"未知来源安装被手机厂商阻止得更严"（OPPO/vivo/小米常见） | README 写三步应对：① 设置 → 安全 → 允许此来源；② 若提示"风险应用禁止安装"，点右上角"仍要安装"；③ 真装不上时，把 APK 放到对方电脑用数据线传/用「手机助手」类软件装，一样可行。 |
| 朋友反馈 LLM 调用 CORS 失败（APP 走 http scheme 调 https API 不会 CORS，但 WebView 有时会报 MIME/证书） | 保持 Capacitor `server.androidScheme = "https"`，且 JS fetch 默认不触发 WebView 老式 CORS；若仍出问题，指导朋友把 LLM Base URL 换成 https 并提供可访问的网络（不用内网 http）。 |
| 免费 debug 签名有效期：debug.keystore 默认有效期超过 30 年，朋友一直用没问题；以后我想给你做 release 签再生成自签名 keystore（keytool 命令，也是免费） | 免费。 |

## 交付物清单
- 源代码里新增：Capacitor 配置、android/ 原生工程、自适应图标 XML、StatusBar JS 接入。
- `.github/workflows/build-apk.yml`：一键触发 Actions 产出 APK。
- README 新增章节：推送→下载→发送→安装→填入 Key 的全流程图文说明（文字版）。
- 最终你能拿到：**一个可直接发微信给安卓朋友安装的 app-debug.apk 文件**，全程 ¥0。
