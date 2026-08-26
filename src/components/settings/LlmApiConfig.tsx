import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { llmPing } from '@/services/llmClient';
import { Check, Loader2, X, Eye, EyeOff } from 'lucide-react';

export default function LlmApiConfig() {
  const s = useAppStore((st) => st.settings);
  const set = useAppStore((st) => st.setSettings);
  const [showK, setShowK] = useState(false);
  const [testing, setTesting] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);

  const test = async () => {
    setTesting(true);
    setOk(null);
    try {
      const res = await llmPing(s);
      setOk(res);
    } catch {
      setOk(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        <label className="block">
          <span className="text-sm text-ink-muted">Base URL</span>
          <input
            value={s.llmBaseUrl}
            onChange={(e) => set({ llmBaseUrl: e.target.value })}
            className="mt-1 w-full h-12 px-3 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-base"
            placeholder="https://api.openai.com/v1"
          />
        </label>
        <label className="block">
          <span className="text-sm text-ink-muted">模型</span>
          <input
            value={s.llmModel}
            onChange={(e) => set({ llmModel: e.target.value })}
            className="mt-1 w-full h-12 px-3 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-base"
            placeholder="gpt-4o-mini"
          />
        </label>
        <label className="block">
          <span className="text-sm text-ink-muted">API Key</span>
          <div className="relative mt-1">
            <input
              value={s.llmApiKey}
              onChange={(e) => set({ llmApiKey: e.target.value })}
              type={showK ? 'text' : 'password'}
              className="w-full h-12 px-3 pr-11 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-base"
              placeholder="sk-..."
            />
            <button
              type="button"
              onClick={() => setShowK((x) => !x)}
              className="absolute right-2 top-1/2 -translate-y-1/2 touch-target p-2 rounded hover:bg-surface-muted text-ink-muted inline-flex items-center justify-center"
            >
              {showK ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={test}
          disabled={testing || !s.llmApiKey.trim() || !s.llmBaseUrl.trim()}
          className="h-12 px-5 rounded-md bg-brand text-white disabled:opacity-60 hover:opacity-90 transition inline-flex items-center gap-2 touch-target"
        >
          {testing ? (
            <>
              <Loader2 size={18} className="animate-spin" /> 测试连接中…
            </>
          ) : (
            '测试连接'
          )}
        </button>
        {ok === true && (
          <span className="inline-flex items-center gap-1 text-success">
            <Check size={18} /> 连接正常
          </span>
        )}
        {ok === false && (
          <span className="inline-flex items-center gap-1 text-danger">
            <X size={18} /> 失败，请检查 Base URL / Key / 网络
          </span>
        )}
      </div>
    </div>
  );
}
