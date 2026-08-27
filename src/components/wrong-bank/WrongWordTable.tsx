import { useMemo, useState } from 'react';
import type { WordBankRecord } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatRelative } from '@/utils/text';
import ProgressBar from './ProgressBar';
import { Play, LogOut, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type Props = {
  onSingleTest: (word: string) => void;
};

export default function WrongWordTable({ onSingleTest }: Props) {
  const list = useAppStore((s) => s.wordBank);
  const remove = useAppStore((s) => s.removeFromWordBank);
  const del = useAppStore((s) => s.deleteRecord);
  const batchDel = useAppStore((s) => s.batchDelete);
  const batchOut = useAppStore((s) => s.batchRemove);

  const [kw, setKw] = useState('');
  const [sort, setSort] = useState<'wrongCount' | 'firstAddedTime' | 'lastWrongTime'>('firstAddedTime');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const lower = kw.trim().toLowerCase();
    let r: WordBankRecord[] = lower
      ? list.filter((w) => w.word.includes(lower))
      : list.slice();
    r.sort((a, b) => {
      if (sort === 'wrongCount') return b.wrongCount - a.wrongCount;
      if (sort === 'lastWrongTime') return b.lastWrongTime - a.lastWrongTime;
      return b.firstAddedTime - a.firstAddedTime;
    });
    return r;
  }, [list, kw, sort]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.word));

  const toggle = (w: string) => {
    const n = new Set(selected);
    if (n.has(w)) n.delete(w);
    else n.add(w);
    setSelected(n);
  };
  const toggleAll = () => {
    setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.word)));
  };

  const selWords = [...selected];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <input
          className="h-12 px-3 rounded-lg bg-surface border border-stroke focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none w-full text-ink placeholder:text-ink-muted"
          placeholder="搜索单词…"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
        <select
          className="h-12 px-3 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand"
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
        >
          <option value="firstAddedTime">按添加时间排序</option>
          <option value="wrongCount">按错误次数排序</option>
          <option value="lastWrongTime">按最近错误时间排序</option>
        </select>
      </div>

      <div className="rounded-xl border border-stroke overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="bg-surface-muted text-ink-muted">
            <tr>
              <th className="w-10 p-3 text-left">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="accent-brand w-5 h-5"
                />
              </th>
              <th className="text-left p-3">单词</th>
              <th className="text-left p-3 w-20">状态</th>
              <th className="text-left p-3">掌握进度</th>
              <th className="hidden sm:table-cell text-left p-3 w-32">添加时间</th>
              <th className="text-left p-3 w-36">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-ink-muted">
                  单词库还是空的，去「查单词」查几个词试试吧～
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.word} className="border-t border-stroke hover:bg-surface-muted/40">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.word)}
                    onChange={() => toggle(r.word)}
                    className="accent-brand w-5 h-5"
                  />
                </td>
                <td className="p-3 font-serif-en font-semibold text-ink">{r.word}</td>
                <td className="p-3">
                  {r.isWrong ? (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs whitespace-nowrap',
                        r.wrongCount >= 3
                          ? 'bg-danger/15 text-danger'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                      )}
                    >
                      错 {r.wrongCount} 次
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                      已收藏
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {r.isWrong ? (
                    <div className="flex items-center gap-3 max-w-[220px]">
                      <ProgressBar
                        className="flex-1"
                        value={r.consecutiveCorrect}
                        max={r.targetCorrect}
                      />
                      <span className="text-xs text-ink-muted tabular-nums whitespace-nowrap">
                        {r.consecutiveCorrect}/{r.targetCorrect}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                </td>
                <td className="hidden sm:table-cell p-3 text-ink-muted whitespace-nowrap">
                  {formatRelative(r.firstAddedTime)}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-0.5">
                    {r.isWrong && (
                      <button
                        type="button"
                        title="重新测试"
                        onClick={() => onSingleTest(r.word)}
                        className="touch-target p-2.5 rounded-md hover:bg-surface-muted text-brand inline-flex items-center justify-center"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      title="移出单词库（标记已掌握）"
                      onClick={() => remove(r.word)}
                      className="touch-target p-2.5 rounded-md hover:bg-surface-muted text-success inline-flex items-center justify-center"
                    >
                      <LogOut size={16} />
                    </button>
                    <button
                      type="button"
                      title="删除记录"
                      onClick={() => {
                        if (confirm(`确认从单词库删除「${r.word}」？`)) del(r.word);
                      }}
                      className="touch-target p-2.5 rounded-md hover:bg-surface-muted text-danger inline-flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selWords.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm p-3 rounded-lg bg-brand-soft/60 text-brand animate-fadeIn">
          <span className="font-medium w-full sm:w-auto">已选 {selWords.length} 项：</span>
          <button
            type="button"
            className="h-11 px-4 rounded-md bg-brand text-white hover:opacity-90 touch-target flex-1 sm:flex-initial"
            onClick={() => {
              if (confirm(`将所选 ${selWords.length} 个词标记为已掌握并移出单词库？`)) {
                batchOut(selWords);
                setSelected(new Set());
              }
            }}
          >
            批量移出
          </button>
          <button
            type="button"
            className="h-11 px-4 rounded-md bg-danger text-white hover:opacity-90 touch-target flex-1 sm:flex-initial"
            onClick={() => {
              if (confirm(`删除所选 ${selWords.length} 条记录？`)) {
                batchDel(selWords);
                setSelected(new Set());
              }
            }}
          >
            批量删除
          </button>
        </div>
      )}
    </div>
  );
}
