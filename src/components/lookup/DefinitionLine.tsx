import { useMemo, useState } from 'react';
import type { WordNode } from '@/types';
import { isClickable, tokenize } from '@/utils/text';
import { cn } from '@/utils/cn';
import {
  Minus,
  Sparkles,
  Check,
  X,
  Loader2,
  Volume2,
  MessageSquareText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { speak } from '@/utils/speak';
import { explainSentence } from '@/services/sentenceExplainer';

type Props = {
  node: WordNode;
  idPrefix?: string;
  onWordClick: (parentId: string, word: string) => void;
  onCollapse: (nodeId: string) => void;
  focusNodeId: string | null;
  onFocus: (id: string | null) => void;
  renderChildren?: React.ReactNode;
};

const depthColor = [
  'border-l-brand',
  'border-l-sky-500',
  'border-l-amber-500',
  'border-l-emerald-500',
  'border-l-rose-500',
];

/** 把英文释义按「句子」拆分：遇 "." 分句，过滤掉太短的碎片 */
function splitSentences(text: string): { start: number; end: number; text: string }[] {
  const result: { start: number; end: number; text: string }[] = [];
  if (!text) return result;
  // 匹配 ". " / ".!" / ".?" / 句末 "." 等断句点
  const re = /([.!?])\s+(?=[A-Z"'(])/g;
  let cursor = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const endPunctAt = m.index + m[1].length; // 包含句末标点
    const seg = text.slice(cursor, endPunctAt).trim();
    if (seg.length >= 12) {
      result.push({ start: cursor, end: endPunctAt, text: seg });
    }
    cursor = endPunctAt;
  }
  const tail = text.slice(cursor).trim();
  if (tail.length >= 12) {
    result.push({ start: cursor, end: text.length, text: tail });
  }
  // 如果完全没找到切分，当是单句（长度≥20 才显示按钮）
  if (result.length === 0 && text.trim().length >= 25) {
    result.push({ start: 0, end: text.length, text: text.trim() });
  }
  return result;
}

export default function DefinitionLine({
  node,
  idPrefix = 'node-',
  onWordClick,
  onCollapse,
  focusNodeId,
  onFocus,
  renderChildren,
}: Props) {
  const tokens = tokenize(node.englishDefinition);
  const border = depthColor[node.depth % depthColor.length];
  const focused = focusNodeId === node.id;
  const settings = useAppStore((s) => s.settings);

  const [activatedWords, setActivatedWords] = useState<Set<string>>(new Set());
  const [guessing, setGuessing] = useState<{
    word: string;
    input: string;
    loading: boolean;
    result: { isCorrect: boolean; degraded: boolean } | null;
  } | null>(null);

  // 句子解释状态：key = 句子 index
  const [sentenceExps, setSentenceExps] = useState<
    Record<number, { open: boolean; loading?: boolean; text?: string; degraded?: boolean }>
  >({});

  const sentences = useMemo(() => splitSentences(node.englishDefinition), [node.englishDefinition]);

  const handleWordClick = (word: string) => {
    onWordClick(node.id, word);
    setActivatedWords((prev) => new Set(prev).add(word));
  };

  const startGuess = (word: string) => {
    setGuessing({ word, input: '', loading: false, result: null });
  };

  const submitGuess = async () => {
    if (!guessing || !guessing.input.trim()) return;
    const record = useAppStore.getState().wordBank.find((w) => w.word === guessing.word);
    if (!record || !record.correctAnswers.length) {
      setGuessing({ ...guessing, result: { isCorrect: false, degraded: true } });
      return;
    }
    setGuessing({ ...guessing, loading: true });
    const result = await useAppStore.getState().guessExampleWord({
      word: guessing.word,
      correctAnswers: record.correctAnswers,
      userAnswer: guessing.input,
      targetCorrect: useAppStore.getState().settings.targetCorrect,
    });
    setGuessing({ ...guessing, loading: false, result });
  };

  const toggleSentenceExplain = async (idx: number) => {
    const cur = sentenceExps[idx];
    if (!cur) {
      // 第一次：加载
      setSentenceExps((p) => ({ ...p, [idx]: { open: true, loading: true } }));
      const seg = sentences[idx];
      const r = await explainSentence(seg?.text ?? '', node.word, settings);
      setSentenceExps((p) => ({
        ...p,
        [idx]: { open: true, loading: false, text: r.markdown, degraded: r.degraded },
      }));
      return;
    }
    if (cur.open) {
      setSentenceExps((p) => ({ ...p, [idx]: { ...cur, open: false } }));
    } else {
      setSentenceExps((p) => ({ ...p, [idx]: { ...cur, open: true } }));
    }
  };

  return (
    <section
      id={`${idPrefix}${node.id}`}
      onMouseEnter={() => onFocus(node.id)}
      className={cn(
        'mb-3 rounded-lg border border-stroke bg-surface-muted/60 border-l-4 p-4 transition',
        border,
        focused && 'ring-2 ring-brand/40',
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <span className="font-serif-en text-ink text-xl font-semibold">{node.word}</span>
          <button
            type="button"
            onClick={() => speak(node.word)}
            title="发音"
            className="p-1 -translate-y-[1px] rounded-md text-ink-muted hover:text-brand hover:bg-brand-soft/50 transition touch-target-sm"
          >
            <Volume2 size={16} />
          </button>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              node.source === 'Oxford'
                ? 'bg-brand-soft text-brand'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
            )}
          >
            {node.source === 'Oxford' ? '📖 Oxford' : '🤖 Oxford via LLM'}
          </span>
          <span className="text-xs text-ink-muted">深度 {node.depth}</span>
        </div>
        {node.depth > 0 && (
          <button
            type="button"
            onClick={() => onCollapse(node.id)}
            title="收起并清除下级"
            className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface transition"
          >
            <Minus size={16} />
          </button>
        )}
      </header>

      {/* 中文释义（折叠显示） */}
      {node.chineseMeanings.length > 0 && (
        <details className="mt-1.5 text-sm text-ink-muted group">
          <summary className="cursor-pointer list-none flex items-center gap-1 select-none hover:text-ink transition marker:hidden">
            <span>中文释义</span>
            <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
          </summary>
          <ul className="list-disc pl-5 space-y-0.5 mt-1">
            {node.chineseMeanings.map((c, i) => (
              <li key={i} className="text-ink">
                {c}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* 英文释义 + 可点击单词 + 猜词按钮 */}
      <p className="mt-2 font-serif-en leading-relaxed text-ink whitespace-pre-wrap break-words">
        {tokens.map((t, i) => {
          if (t.type === 'ws') return <span key={i}>{t.value}</span>;
          if (!isClickable(t)) return <span key={i}>{t.value}</span>;
          const isActivated = activatedWords.has(t.clean!);
          return (
            <span key={i} className="inline-flex items-baseline">
              <button
                type="button"
                onClick={() => handleWordClick(t.clean!)}
                className="text-brand border-b border-dotted border-brand/60 hover:text-brand/80 hover:bg-brand-soft/50 px-0.5 rounded transition"
              >
                {t.value}
              </button>
              {isActivated && (
                <>
                  {/* 点击激活后：猜词按钮 + 发音小喇叭 */}
                  <button
                    type="button"
                    onClick={() => speak(t.clean!)}
                    title="读这个词"
                    className="ml-0.5 inline-flex items-center text-xs px-1 py-0.5 rounded bg-ink-muted/10 text-ink-muted hover:bg-ink-muted/20 transition align-middle"
                  >
                    <Volume2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startGuess(t.clean!)}
                    title="猜猜这个词的意思"
                    className="ml-0.5 inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition align-middle"
                  >
                    <Sparkles size={12} />
                    猜
                  </button>
                </>
              )}
            </span>
          );
        })}
      </p>

      {/* 句子解释：每个句子加「解释」按钮，展开显示 LLM 讲解 */}
      {sentences.length > 0 && (
        <div className="mt-3 space-y-2">
          {sentences.map((seg, idx) => {
            const st = sentenceExps[idx];
            const open = st?.open;
            return (
              <div
                key={idx}
                className={cn(
                  'rounded-md border border-stroke/60 bg-surface/70 p-2.5 transition',
                  open && 'border-brand/40 bg-brand-soft/20',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-serif-en text-[0.92rem] leading-relaxed text-ink/90 flex-1">
                    {seg.text}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => speak(seg.text, { rate: 0.9 })}
                      title="朗读整句"
                      className="p-1.5 rounded-md text-ink-muted hover:text-brand hover:bg-brand-soft/50 transition touch-target-sm"
                    >
                      <Volume2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSentenceExplain(idx)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 transition touch-target-sm whitespace-nowrap"
                    >
                      <MessageSquareText size={13} />
                      解释
                      {st?.loading ? (
                        <Loader2 size={13} className="animate-spin ml-0.5" />
                      ) : open ? (
                        <ChevronUp size={13} />
                      ) : (
                        <ChevronDown size={13} />
                      )}
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="mt-2 text-sm text-ink whitespace-pre-wrap border-t border-stroke/60 pt-2 animate-slideDown">
                    {st?.loading ? (
                      <div className="flex items-center gap-2 text-ink-muted">
                        <Loader2 size={14} className="animate-spin" />
                        正在生成讲解…
                      </div>
                    ) : st?.degraded ? (
                      <div
                        className="text-ink-muted italic"
                        dangerouslySetInnerHTML={{
                          __html: (st?.text ?? '').replace(/\n/g, '<br/>'),
                        }}
                      />
                    ) : (
                      <div
                        className="space-y-1.5 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: (st?.text ?? '')
                            .replace(/^1）【([^】]+)】/gm, '<div class="font-semibold text-sky-700 dark:text-sky-300 mt-2 first:mt-0">$1</div>')
                            .replace(/^2）【([^】]+)】/gm, '<div class="font-semibold text-amber-700 dark:text-amber-400 mt-2">$1</div>')
                            .replace(/^3）【([^】]+)】/gm, '<div class="font-semibold text-emerald-700 dark:text-emerald-400 mt-2">$1</div>')
                            .replace(/^(\d+\.|\-)\s?/gm, '• ')
                            .replace(/\n/g, '<br/>'),
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 猜词输入区 */}
      {guessing && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 p-3 animate-slideDown">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-ink">
              猜猜「<span className="font-serif-en font-semibold">{guessing.word}</span>」的中文意思
            </span>
            <button
              type="button"
              onClick={() => speak(guessing.word)}
              className="ml-auto p-1.5 rounded-md text-amber-600 dark:text-amber-300 hover:bg-amber-500/20 transition"
              title="听发音"
            >
              <Volume2 size={14} />
            </button>
          </div>
          {guessing.result ? (
            <div className="space-y-2">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                  guessing.result.isCorrect
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-danger/15 text-danger',
                )}
              >
                {guessing.result.isCorrect ? <Check size={18} /> : <X size={18} />}
                <span>
                  {guessing.result.isCorrect
                    ? '猜对了！这个词已加入单词库。'
                    : '没猜对，已记入单词库标记为错词。'}
                  {guessing.result.degraded && '（语义服务降级）'}
                </span>
              </div>
              <div className="text-xs text-ink-muted">
                正确答案：
                {useAppStore
                  .getState()
                  .wordBank.find((w) => w.word === guessing.word)?.correctAnswers.join('；')}
              </div>
              <button
                type="button"
                onClick={() => setGuessing(null)}
                className="h-9 px-3 rounded-md bg-surface border border-stroke text-sm text-ink hover:bg-surface-muted transition"
              >
                关闭
              </button>
            </div>
          ) : (
            <form
              className="flex gap-2 flex-wrap"
              onSubmit={(e) => {
                e.preventDefault();
                submitGuess();
              }}
            >
              <input
                autoFocus
                value={guessing.input}
                onChange={(e) => setGuessing({ ...guessing, input: e.target.value })}
                placeholder="输入你猜的中文意思…"
                className="flex-1 min-w-[180px] h-10 px-3 rounded-md bg-surface border border-stroke outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-sm"
              />
              <button
                type="submit"
                disabled={!guessing.input.trim() || guessing.loading}
                className="h-10 px-4 rounded-md bg-brand text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition inline-flex items-center gap-1.5"
              >
                {guessing.loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                核对
              </button>
              <button
                type="button"
                onClick={() => setGuessing(null)}
                className="h-10 px-3 rounded-md bg-surface border border-stroke text-sm text-ink-muted hover:bg-surface-muted transition"
              >
                取消
              </button>
            </form>
          )}
        </div>
      )}

      {renderChildren}
    </section>
  );
}
