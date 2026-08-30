import type { Settings } from '@/types';
import { llmChat } from './llmClient';

const PROMPT = (sentence: string, targetWord?: string) =>
  `请用中文简明讲解下面这个英文句子（来自词典例句或释义），针对英文学习者：
原文句子："${sentence}"${targetWord ? `\n当前学习的关键词："${targetWord}"` : ''}

请按以下 3 点结构输出，不要多余废话：
1）【译文】整句准确中文翻译
2）【关键词】标注句中 2-4 个重点词汇/短语，附上词性和简要中文释义（含常见搭配）
3）【句法】简单拆解句子结构和可能的难点（例如从句、分词短语、特殊句式），1-2 句讲清楚即可`;

export async function explainSentence(
  sentence: string,
  targetWord: string | undefined,
  settings: Settings,
): Promise<{ markdown: string; degraded: boolean }> {
  if (!settings.llmApiKey.trim()) {
    return {
      markdown:
        '> ⚠️ 需要先配置 LLM API Key 才能使用「句子解释」功能。\n>\n> 请前往「设置」页面填入 API Key。',
      degraded: true,
    };
  }
  try {
    const out = await llmChat(
      settings,
      PROMPT(sentence.trim(), targetWord),
      '你是一名耐心的英语讲解老师，回答简洁、面向中文学习者。',
    );
    return { markdown: out.trim(), degraded: false };
  } catch (e) {
    return {
      markdown:
        '> ⚠️ 暂时无法获取句子解释（' + ((e as Error).message || '网络错误').slice(0, 60) + '）',
      degraded: true,
    };
  }
}
