# RecurWords · 递归式英文词汇学习

用英文解释英文，遇到不懂的词继续「点一下深挖」，层层递归直到整棵释义树全看懂 → 回到原词自测中文意思 → **答错自动进入错题库** → 连续答对 N 次自动攻克。

- 纯前端 React 18 + Vite 5 + TypeScript 5 + Tailwind 3 + Zustand 4；
- 所有**错题 / 已掌握 / 设置**都存在你自己设备的 **localStorage**，不上传服务器；
- 移动端已经响应式适配（底部 Tab Bar + 触摸 44px 按钮 + 安全区 + 动态视口）；
- 支持 **PWA 添加到主屏幕** 像原生 App 一样启动；
- 支持 **免费安卓 APK**，发给朋友就能装（不进 Google Play，不用交开发者费用）。

---

## 快速开始（电脑本地开发）

1. 安装 **Node.js LTS 20**（官网下载即可，安装包自带 npm）；
2. 进入项目目录：

```powershell
cd <项目路径>
npm install
```

3. 三种启动方式任选：

```powershell
npm run dev          # 只本机用，访问 http://localhost:5173
npm run dev:mobile   # 同 WiFi 手机可访问：电脑 IP:5173（如 http://192.168.1.10:5173）
npm run build        # 产出生产包到 ./dist
npm run preview:mobile   # 预览生产包，手机也能访问
```

### 首次使用必须做的（三选一）
打开「设置」页，至少填 **LLM Base URL + API Key + Model**（必填，用于兜底释义和语义判定）。
- 同时填 **Oxford API app_id / app_key** 可获得最权威的牛津词典释义（未配置或失败会自动回落 LLM，不阻断使用）。

手机端与桌面端用的是同一套逻辑，数据均存在本地浏览器/APP 本地存储。

---

## 手机访问

### 🅰 方式 A：手机走网页（最快，0 成本）
1. `npm run dev:mobile`（或 `preview:mobile`）；
2. 打开命令行执行 `ipconfig`，看"无线局域网适配器 WLAN"的 **IPv4 地址**（如 192.168.1.10）；
3. 手机连接同一条 WiFi，浏览器打开 `http://<你的电脑IP>:5173`；
4. （推荐）Safari / Chrome 中选「分享 → 添加到主屏幕」，之后桌面就有独立图标，全屏运行和 App 一样。

> 📶 如果手机打不开：Windows 搜索「Windows Defender 防火墙」→「允许应用通过防火墙」→ 勾选 **Node.js JavaScript Runtime** 的「专用网络」。

### 🅱 方式 B：免费产出安卓 APK 发给朋友装（推荐你选的方案 B）

全程 **¥ 0**，不用买签名证书、不用交 Google Play 注册费、不用装 10GB Android Studio。

**前置条件**：一个免费的 GitHub 账户 + 基础 git 操作。

#### 操作步骤（七步）
1. **注册 GitHub** 并创建一个 **私有 / 公开都可以的免费仓库**（比如 `recurwords-apk`）；
2. **开启 Actions 权限**：进入仓库 → Settings → Actions → General →
   - Actions permissions: 选 **Allow all actions and reusable workflows**；
   - Workflow permissions: 选 **Read and write permissions**；
   - 保存。
3. 本地把项目推上去（命令行示例，仓库名按你实际的改）：

```powershell
cd <项目根目录>
git init
git add -A
git commit -m "Initial RecurWords"
git branch -M main
# 下面一行换成你 GitHub 仓库真实地址
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

4. GitHub 页面切到 **Actions** 标签 → 会看到一个 workflow 叫 `Build RecurWords Android (APK · debug · free)`，正在运行（绿色转圈）；
5. 等 **2-5 分钟**（第一次要 Gradle 下载依赖慢一点，之后有缓存就快）；点进最新的 workflow run；
6. 页面最底部有 **Artifacts** 区域 → 下载 `recurwords-debug-apk.zip` → 解压得到 `app-debug.apk`（大小通常 8~15MB 左右）；
7. 把 `app-debug.apk` 发给朋友（微信/QQ/网盘都行），对方按下面方式安装：

#### 朋友如何安装 APK
安卓 7.0 及以上（覆盖 98% 机型）：

1. 用**文件管理器**打开收到的 apk 文件（不要直接在微信里点「用其他应用打开」，部分微信版本会拦截安装）；
2. 第一次系统会弹出「未知来源 / 安装被阻止」→ 点 **允许本次安装**，或跳到系统设置里，给「文件管理器」/「QQ」/「微信」开启「允许未知来源安装应用」；
3. 返回再点一次「安装」；
4. 装完桌面出现 **RecurWords** 图标，点开即可；
5. **首次使用**，引导朋友在「设置」里填入他自己的 **LLM Base URL + Key**，否则查词会失败（我们**不内置**共享 Key，防止被抓包刷爆额度）。

#### 常见问题
| 症状 | 原因 & 解决 |
|---|---|
| 「解析包错误」 | 安卓系统低于 7.0，或下载到的 zip 没解压、传的时候损坏。 |
| 手机一直说「风险应用，建议卸载」「禁止安装」 | 这是 debug 签名的典型现象，点「仍要安装 / 继续安装 / 忽略风险」；华为/小米/OPPO 需要把「手机管家-安全守护」里本次临时允许。 |
| 装完后打不开，白屏或一闪就退 | 通常是 LLM 配置错误 → 先查设置里的 Base URL / Key 是否对；或朋友的手机完全断网。 |
| 查词时 Oxford API 显示失败 | APK 里没有 Vite 那个 `/oxford` 代理；**APK 使用官方 Oxford 必须填设置里的 `oxfordProxyBase`**（即自建一个能把 `/api/v2` 转发到 `od-api.oxforddictionaries.com` 的代理服务），不想搭代理就把「数据源」设为「仅 LLM 兜底」。 |
| GitHub Actions 跑失败，找不到 apk | 先点 run 看哪一步红了：常见是 `npm install` 失败（网络波动，re-run 一下）；或 Gradle 第一次下载依赖超时（再 re-run jobs 一次基本就好）。 |

---

## 备选 · 本地 Android Studio 打包（离线 / 无 GitHub 也能包）

不想用 GitHub Actions？你可以自己装 Android Studio 在电脑本地产 APK，一样免费。

1. 官网 [developer.android.com](https://developer.android.com/studio) 下载安装 Android Studio（免费），安装时**全勾 Android SDK**；
2. 项目目录：

```powershell
npm install
npm run build     # 出 dist
npx cap sync android   # 把 dist 复制进 android assets
```

3. 打开 Android Studio → Open → 选项目里的 `android/` 子目录；
4. 让 Android Studio 执行 Gradle Sync（首次会自动下载 AGP/Gradle/Platform-tools，可能几十分钟）；
5. 菜单栏 → **Build → Build Bundle(s)/APK(s) → Build APK(s)**；
6. 右下角会弹 Event Log，点 `locate` 会带你到：
   `android/app/build/outputs/apk/debug/app-debug.apk`
7. 发这个 APK 给朋友，安装流程同「方式 B 第 7 步」。

---

## 功能一页速览
- **🔎 查单词**：输入英文 → 显示牛津英英释义 → 点释义里不认识的词 → 递归展开下一级；顶部/左侧有「导航树」和「深度指示」快速跳转。
- **✅ 自测**：全树看懂后点「我已理解，开始测试」，输入你对原词的中文理解 → 系统通过 LLM 做**语义匹配判定**（近义词也算对）。
- **📒 错题库**：答错自动入库，按「错误次数 + 距离上次错误天数 + 连续答对进度」加权生成复习队列；支持搜索/排序/批量移出或删除。
- **🧠 攻克规则**：连续答对 `N` 次（默认 3 次，设置里 1-10 可调）自动标记为"已掌握"，移出错题库。
- **⚙️ 设置**：数据源切换（牛津优先 / 仅 LLM 兜底）、Oxford API、LLM API、连续答对阈值、一键清空全部数据。
- **🌓 主题**：明 / 暗 / 跟随系统三档，默认跟随系统；iOS/Android 壳内状态栏颜色会自动匹配品牌紫。

## 技术栈
React 18 + TypeScript 5 + Vite 5 + Tailwind CSS 3 + Zustand 4 + Zod 3 + lucide-react + PWA(vite-plugin-pwa) + Capacitor 6（Android 壳）。

## 数据与隐私
错题、设置、已掌握均存本地存储。外部请求只有两条：牛津词典官方 API / 你自己配的 LLM 接口，没有中间服务器存储任何 Key。

# (auto trigger Actions build - 2026-08-27T00:23:08.9684941+08:00)
