import type { Settings } from '@/types';
import { fetchChineseMeanings, fetchEnglishDefinition } from './oxfordClient';
import { llmJson } from './llmClient';
import { ChineseMeaningsSchema, DefinitionSchema } from '@/utils/zodSchemas';

export interface FetchWordResult {
  englishDefinition: string;
  chineseMeanings: string[];
  source: 'Oxford' | 'LLM';
}

const LLM_DEFINITION_PROMPT = (w: string) =>
  `请基于牛津高阶英语词典（Oxford Advanced Learner's Dictionary）的释义原文，给出单词 '${w}' 的英文释义（1-2句）。不要在解释中使用该单词本身。返回 JSON：{"definition": "释义内容", "source": "Oxford via LLM"}`;

const LLM_CHINESE_PROMPT = (w: string) =>
  `请基于牛津英汉双解词典，列出英文单词 '${w}' 的所有中文释义。严格返回 JSON 字符串数组，如 ["意思1","意思2"]。不要多余文字。`;

export async function fetchWord(word: string, settings: Settings): Promise<FetchWordResult> {
  if (
    settings.dataSource === 'oxford_api_preferred' &&
    settings.oxfordAppId &&
    settings.oxfordAppKey
  ) {
    const [def, zh] = await Promise.all([
      fetchEnglishDefinition(word, settings),
      fetchChineseMeanings(word, settings),
    ]);
    if (def && zh && zh.length) {
      return { englishDefinition: def, chineseMeanings: zh, source: 'Oxford' };
    }
  }
  const [defRes, zhRes] = await Promise.all([
    llmJson(settings, LLM_DEFINITION_PROMPT(word), DefinitionSchema),
    llmJson(settings, LLM_CHINESE_PROMPT(word), ChineseMeaningsSchema),
  ]);
  const meanings = Array.isArray(zhRes) ? zhRes : [];
  return {
    englishDefinition: defRes.definition,
    chineseMeanings: meanings,
    source: 'LLM',
  };
}
