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
      tokens.push({ type: 'punct', value: v });
    } else {
      tokens.push({ type: 'punct', value: v });
    }
  }
  return tokens;
}

export function isClickable(t: Token): boolean {
  return t.type === 'word' && !!t.clean && t.clean.length >= 3;
}

const TRIM_CHARS = /[\s\u3000，。；：！？、,.!?:;"'""''()（）\[\]【】\-—…·]+/g;

export function normalizeChinese(raw: string): string {
  return raw
    .trim()
    .replace(TRIM_CHARS, '')
    .replace(/\s+/g, '');
}

export function formatRelative(ts: number): string {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const min = 60 * 1000,
    hr = 60 * min,
    day = 24 * hr;
  if (diff < min) return '刚刚';
  if (diff < hr) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hr)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
