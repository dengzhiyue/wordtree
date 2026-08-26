import type { Settings } from '@/types';
import type { ZodSchema } from 'zod';

export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export class LLMNotConfiguredError extends Error {
  constructor() {
    super('请先在「设置」页填入 LLM API Key。');
  }
}

async function request(settings: Settings, messages: ChatMessage[], json: boolean): Promise<string> {
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
  systemPrompt = '你是一个严谨的 JSON 输出助手。严格按请求返回合法 JSON，不要多余解释。',
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
    return schema.parse(parsed);
  } catch (e) {
    console.error('[llmJson] parse error:', content);
    throw new Error('LLM 输出的 JSON 格式不正确：' + (e as Error).message);
  }
}

export async function llmPing(settings: Settings): Promise<boolean> {
  const out = await llmChat(settings, '只输出一个词：OK');
  return out.trim().length > 0;
}
