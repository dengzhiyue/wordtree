import { ChevronRight } from 'lucide-react';
import type { WordNode } from '@/types';
import { cn } from '@/utils/cn';

type Props = {
  root: WordNode;
  focusId: string | null;
  onJump: (id: string) => void;
};

function Item({
  node,
  focusId,
  onJump,
  depth,
}: {
  node: WordNode;
  focusId: string | null;
  onJump: (id: string) => void;
  depth: number;
}) {
  const active = focusId === node.id;
  return (
    <div>
      <button
        type="button"
        onClick={() => onJump(node.id)}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={cn(
          'w-full text-left flex items-center gap-1 py-1.5 pr-2 rounded-md text-sm transition',
          active
            ? 'text-brand bg-brand-soft font-medium'
            : 'text-ink-muted hover:text-ink hover:bg-surface-muted',
        )}
      >
        <ChevronRight size={14} className={cn('transition', node.expanded && 'rotate-90')} />
        <span className="truncate">{node.word}</span>
      </button>
      {node.expanded
        ? node.children.map((c) => (
            <Item key={c.id} node={c} focusId={focusId} onJump={onJump} depth={depth + 1} />
          ))
        : null}
    </div>
  );
}

export default function NavTree({ root, focusId, onJump }: Props) {
  return (
    <div className="rounded-xl border border-stroke bg-surface p-3 overflow-auto max-h-[70vh]">
      <div className="text-xs text-ink-muted px-2 pb-2 border-b border-stroke mb-2">递归导航树</div>
      <Item node={root} focusId={focusId} onJump={onJump} depth={0} />
    </div>
  );
}
