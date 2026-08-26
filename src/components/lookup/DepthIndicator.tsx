import type { WordNode } from '@/types';

function maxDepth(n: WordNode): number {
  if (!n.children.length) return n.depth;
  return Math.max(n.depth, ...n.children.map(maxDepth));
}

export default function DepthIndicator({ root }: { root: WordNode }) {
  const d = maxDepth(root);
  const tags = Array.from({ length: d + 1 }, (_, i) => i);
  return (
    <div className="flex items-center gap-2 text-xs text-ink-muted">
      <span>当前共展开</span>
      <div className="flex gap-1">
        {tags.map((i) => (
          <span
            key={i}
            className="px-1.5 py-0.5 rounded bg-surface-muted border border-stroke"
          >
            {i} 层
          </span>
        ))}
      </div>
    </div>
  );
}
