import { useState } from 'react';
import type { WordNode } from '@/types';
import { isClickable, tokenize } from '@/utils/text';
import { cn } from '@/utils/cn';
import { Minus, Sparkles, Check, X, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

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

  const [activatedWords, setActivatedWords] = useState<Set<string>>(new Set());
  const [guessing, setGuessing] = useState<{
    word: string;
    input: string;
    loading: boolean;
    result: { isCorrect: boolean; degraded: boolean } | null;
  } | null>(null);

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
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-serif-en text-ink text-xl font-semibold">{node.word}</span>
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
      <p className="mt-2 font-serif-en leading-relaxed text-ink">
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
                <button
                  type="button"
                  onClick={() => startGuess(t.clean!)}
                  title="猜猜这个词的意思"
                  className="ml-0.5 inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition align-middle"
                >
                  <Sparkles size={12} />
                  猜
                </button>
              )}
            </span>
          );
        })}
      </p>

      {/* 猜词输入区 */}
      {guessing && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 p-3 animate-slideDown">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-ink">
              猜猜「<span className="font-serif-en font-semibold">{guessing.word}</span>」的中文意思
            </span>
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
                {guessing.result.isCorrect ? (
                  <Check size={18} />
                ) : (
                  <X size={18} />
                )}
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
              className="flex gap-2"
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
                className="flex-1 h-10 px-3 rounded-md bg-surface border border-stroke outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-sm"
              />
              <button
                type="submit"
                disabled={!guessing.input.trim() || guessing.loading}
                className="h-10 px-4 rounded-md bg-brand text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition inline-flex items-center gap-1.5"
              >
                {guessing.loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
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
