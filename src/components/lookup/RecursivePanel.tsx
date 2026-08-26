import type { WordNode } from '@/types';
import DefinitionLine from './DefinitionLine';
import { cn } from '@/utils/cn';

type Props = {
  root: WordNode;
  idPrefix?: string;
  onWordClick: (pid: string, w: string) => void;
  onCollapse: (id: string) => void;
  focusNodeId: string | null;
  onFocus: (id: string | null) => void;
};

function Node({
  node,
  idPrefix,
  onWordClick,
  onCollapse,
  focusNodeId,
  onFocus,
}: {
  node: WordNode;
} & Omit<Props, 'root'>) {
  const kids = node.expanded ? node.children : [];
  return (
    <>
      <DefinitionLine
        node={node}
        idPrefix={idPrefix}
        onWordClick={onWordClick}
        onCollapse={onCollapse}
        focusNodeId={focusNodeId}
        onFocus={onFocus}
        renderChildren={
          kids.length ? (
            <div
              className={cn(
                'mt-4 animate-slideDown overflow-hidden',
                node.depth === 0 ? 'pl-4 sm:pl-6' : 'pl-3 sm:pl-5',
              )}
            >
              {kids.map((c) => (
                <Node
                  key={c.id}
                  node={c}
                  idPrefix={idPrefix}
                  onWordClick={onWordClick}
                  onCollapse={onCollapse}
                  focusNodeId={focusNodeId}
                  onFocus={onFocus}
                />
              ))}
            </div>
          ) : undefined
        }
      />
    </>
  );
}

export default function RecursivePanel(p: Props) {
  return (
    <div className="space-y-1">
      <Node
        node={p.root}
        idPrefix={p.idPrefix}
        onWordClick={p.onWordClick}
        onCollapse={p.onCollapse}
        focusNodeId={p.focusNodeId}
        onFocus={p.onFocus}
      />
    </div>
  );
}
