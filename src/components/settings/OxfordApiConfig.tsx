import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Eye, EyeOff, ExternalLink } from 'lucide-react';

export default function OxfordApiConfig() {
  const s = useAppStore((st) => st.settings);
  const set = useAppStore((st) => st.setSettings);
  const [showId, setShowId] = useState(false);
  const [showKey, setShowKey] = useState(false);
  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        <label className="block">
          <span className="text-sm text-ink-muted">app_id</span>
          <div className="relative mt-1">
            <input
              value={s.oxfordAppId}
              onChange={(e) => set({ oxfordAppId: e.target.value })}
              type={showId ? 'text' : 'password'}
              className="w-full h-12 px-3 pr-11 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-base"
              placeholder="在 developer.oxforddictionaries.com 申请"
            />
            <button
              type="button"
              onClick={() => setShowId((x) => !x)}
              className="absolute right-2 top-1/2 -translate-y-1/2 touch-target p-2 rounded hover:bg-surface-muted text-ink-muted inline-flex items-center justify-center"
            >
              {showId ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="text-sm text-ink-muted">app_key</span>
          <div className="relative mt-1">
            <input
              value={s.oxfordAppKey}
              onChange={(e) => set({ oxfordAppKey: e.target.value })}
              type={showKey ? 'text' : 'password'}
              className="w-full h-12 px-3 pr-11 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-base"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowKey((x) => !x)}
              className="absolute right-2 top-1/2 -translate-y-1/2 touch-target p-2 rounded hover:bg-surface-muted text-ink-muted inline-flex items-center justify-center"
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
      </div>
      <label className="block">
        <span className="text-sm text-ink-muted">生产环境代理 Base URL（选填）</span>
        <input
          value={s.oxfordProxyBase}
          onChange={(e) => set({ oxfordProxyBase: e.target.value })}
          className="mt-1 w-full h-12 px-3 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-base"
          placeholder="如 https://<你的代理>/api/v2，开发环境可留空（已自带 /oxford 代理）"
        />
      </label>
      <a
        className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
        href="https://developer.oxforddictionaries.com"
        target="_blank"
        rel="noreferrer"
      >
        去 Oxford Dictionaries 申请 API <ExternalLink size={14} />
      </a>
    </div>
  );
}
