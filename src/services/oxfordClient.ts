import type { Settings } from '@/types';

function buildBase(settings: Settings): string {
  if (settings.oxfordProxyBase.trim()) return settings.oxfordProxyBase.replace(/\/$/, '');
  // Vite dev server 代理 /oxford -> https://od-api.oxforddictionaries.com/
  // 若用户未填代理且不在 dev，我们直接尝试官方直连，失败时 wordFetcher 会回落 LLM
  if (import.meta.env.DEV) return '/oxford/api/v2';
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
