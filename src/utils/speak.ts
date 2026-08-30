// Web Speech API 发音工具：零依赖、离线可用
let cachedVoice: SpeechSynthesisVoice | null = null;

function pickEnVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  const want = ['Google US English', 'Microsoft Zira - English (United States)', 'Microsoft Guy - English (United States)', 'Samantha'];
  for (const name of want) {
    const v = voices.find((x) => x.name === name && /en[-_]?US/i.test(x.lang || x.name));
    if (v) {
      cachedVoice = v;
      return v;
    }
  }
  // 兜底：任何英语 voice
  const any = voices.find((x) => /^en[-_]?/i.test(x.lang)) || null;
  cachedVoice = any;
  return any;
}

// iOS/Safari 上 voices 是异步加载的，需要监听一下
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickEnVoice();
  };
}

export function speak(text: string, opts?: { rate?: number; pitch?: number; volume?: number }): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    const v = pickEnVoice();
    if (v) u.voice = v;
    u.rate = opts?.rate ?? 0.95;
    u.pitch = opts?.pitch ?? 1;
    u.volume = opts?.volume ?? 1;
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) {
    console.warn('[speak] 发音失败：', e);
    return false;
  }
}

export function isSpeakSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
