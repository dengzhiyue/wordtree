import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Capacitor 原生环境下的一次性启动适配（浏览器/PWA 下直接跳过）
 * - 把状态栏背景色设置为品牌紫，让启动后头部和底部 Tab Bar 更有 App 感
 * - 错误被吞掉：个别机型 webview 无法操作 StatusBar 不影响核心功能
 */
export async function bootMobileShell(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    if (Capacitor.getPlatform() !== 'android') return;
    await StatusBar.setBackgroundColor({ color: '#7c3aed' }).catch(() => void 0);
    await StatusBar.setStyle({ style: Style.Default }).catch(() => void 0);
    // 安全区：让内容不沉浸在底部导航栏/刘海。
    // WebView 已经在 index.css 用 env(safe-area-inset-*) 处理。
  } catch {
    // 忽略：非原生或权限失败都不影响使用
  }
}
