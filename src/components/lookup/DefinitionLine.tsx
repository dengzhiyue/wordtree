import type { WordNode } from '@/types';
import { isClickable, tokenize } from '@/utils/text';
import { cn } from '@/utils/cn';
import { Minus } from 'lucide-react';

type Props = {
  node: WordNode;
  idPrefix?: string; // 为不同容器（Lookup / ReviewModal）提供不同的 DOM id 前缀
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
          return (
            <button
              key={i}
              type="button"
              onClick={() => onWordClick(node.id, t.clean!)}
              className="text-brand border-b border-dotted border-brand/60 hover:text-brand/80 hover:bg-brand-soft/50 px-0.5 rounded transition"
            >
              {t.value}
            </button>
          );
        })}
      </p>
      {renderChildren}
    </section>
  );
}
