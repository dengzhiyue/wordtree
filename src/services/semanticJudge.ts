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
