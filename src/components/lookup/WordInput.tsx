import { Search } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';

export default function WordInput() {
  const start = useAppStore((s) => s.startLookup);
  const phase = useAppStore((s) => s.phase);
  const [v, setV] = useState('');
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(v);
  };
  const loading = phase === 'loading';
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="输入英文单词，如 recursive, ephemeral..."
          className="w-full h-11 pl-10 pr-3 rounded-lg bg-surface border border-stroke focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-ink placeholder:text-ink-muted"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !v.trim()}
        className="h-11 px-5 rounded-lg bg-brand text-white font-medium disabled:opacity-60 hover:opacity-90 transition"
      >
        {loading ? '查询中…' : '查询'}
      </button>
    </form>
  );
}
