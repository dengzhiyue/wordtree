import { useState } from 'react';
import type { WordBook, WordBookTreeNode } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatRelative } from '@/utils/text';
import { cn } from '@/utils/cn';
import { Trash2, TreePine, ChevronLeft } from 'lucide-react';

const branchColors = [
  'bg-brand/15 border-brand/40 text-brand',
  'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300',
  'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300',
  'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
  'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-300',
];

function TreeBranch({ node, isRoot }: { node: WordBookTreeNode; isRoot?: boolean }) {
  const color = branchColors[node.depth % branchColors.length];

  return (
    <div className="flex flex-col items-center">
      {/* 子节点在上方（树枝向上生长） */}
      {node.children.length > 0 && (
        <>
          <div className="flex flex-row justify-center gap-2 sm:gap-4 flex-wrap">
            {node.children.map((child, i) => (
              <TreeBranch key={i} node={child} />
            ))}
          </div>
          {/* 连接线 */}
          <div className="w-px h-3 bg-stroke" />
        </>
      )}

      {/* 节点 */}
      <div
        className={cn(
          'rounded-lg border-2 px-3 py-2 text-center min-w-[80px] max-w-[200px]',
          isRoot ? 'bg-brand text-white border-brand shadow-md' : color,
        )}
      >
        <div className={cn('font-serif-en font-semibold text-sm', isRoot && 'text-base')}>
          {node.word}
        </div>
        {node.chineseMeanings.length > 0 && (
          <div className={cn('text-xs mt-0.5', isRoot ? 'text-white/80' : 'opacity-70')}>
            {node.chineseMeanings.slice(0, 3).join('；')}
          </div>
        )}
      </div>
    </div>
  );
}

function WordBookDetail({ book, onBack }: { book: WordBook; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="touch-target p-2 rounded-md hover:bg-surface-muted text-ink-muted"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-lg font-semibold font-serif-en">{book.rootWord}</h2>
          <p className="text-xs text-ink-muted">
            {book.nodeCount} 个词 · {formatRelative(book.createdAt)}
          </p>
        </div>
      </div>

      {/* 树可视化：树干在下，树枝往上 */}
      <div className="rounded-2xl border border-stroke bg-surface-muted/30 p-4 sm:p-8 overflow-x-auto">
        <div className="flex flex-col items-center min-w-fit pb-4">
          <TreeBranch node={book.tree} isRoot />
        </div>
        <div className="text-center text-xs text-ink-muted mt-2">
          🌳 树干（底部）= 起始查询词，往上每一层是递归探索的词
        </div>
      </div>
    </div>
  );
}

export default function WordBookPage() {
  const wordBooks = useAppStore((s) => s.wordBooks);
  const deleteWordBook = useAppStore((s) => s.deleteWordBook);
  const [selectedBook, setSelectedBook] = useState<WordBook | null>(null);

  if (selectedBook) {
    return <WordBookDetail book={selectedBook} onBack={() => setSelectedBook(null)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">单词树</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          递归查词时展开 5 个以上词后，可生成一棵单词树。树干是起始词，往上每层是探索的词。
        </p>
      </div>

      {wordBooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stroke p-8 text-center text-ink-muted">
          <TreePine size={40} className="mx-auto mb-3 opacity-50" />
          <div className="font-medium text-ink mb-1">还没有单词树</div>
          <p className="text-sm max-w-md mx-auto">
            去「查单词」输入一个词，递归展开 5 个以上的词后，底部会出现「生成单词树」按钮。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wordBooks.map((book) => (
            <div
              key={book.id}
              className="rounded-xl border border-stroke bg-surface p-4 hover:shadow-md transition cursor-pointer group"
              onClick={() => setSelectedBook(book)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <TreePine size={20} className="text-brand" />
                  <span className="font-serif-en font-semibold text-lg">{book.rootWord}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`确认删除单词树「${book.rootWord}」？`)) {
                      deleteWordBook(book.id);
                    }
                  }}
                  className="touch-target p-1.5 rounded-md text-ink-muted hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-2 text-sm text-ink-muted">
                {book.nodeCount} 个词 · {formatRelative(book.createdAt)}
              </div>
              {/* 小型树预览 */}
              <div className="mt-3 flex items-end justify-center gap-1 h-12">
                {Array.from({ length: Math.min(book.nodeCount, 8) }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-sm bg-brand/20"
                    style={{
                      width: 4,
                      height: `${30 + Math.sin(i * 0.8) * 15 + 15}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
