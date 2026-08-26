import { useAppStore } from '@/store/useAppStore';
import type { DataSourceMode } from '@/types';
import { cn } from '@/utils/cn';

const options: { v: DataSourceMode; title: string; desc: string }[] = [
  {
    v: 'oxford_api_preferred',
    title: '牛津词典 API（优先）',
    desc: '优先调用官方 Oxford Dictionaries API 取释义与中文翻译，失败或未配置时自动回落 LLM。',
  },
  {
    v: 'llm_only',
    title: '仅 LLM（兜底模式）',
    desc: '完全通过 LLM 取"基于牛津词典原文"的释义与中文意思，无需申请 Oxford API Key。',
  },
];

export default function DataSourceSelect() {
  const mode = useAppStore((s) => s.settings.dataSource);
  const set = useAppStore((s) => s.setSettings);
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {options.map((o) => {
        const sel = mode === o.v;
        return (
          <button
            type="button"
            key={o.v}
            onClick={() => set({ dataSource: o.v })}
            className={cn(
              'text-left p-4 rounded-xl border transition',
              sel
                ? 'border-brand bg-brand-soft/40 ring-2 ring-brand/30'
                : 'border-stroke hover:bg-surface-muted',
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                  sel ? 'border-brand' : 'border-stroke',
                )}
              >
                {sel && <span className="w-2 h-2 rounded-full bg-brand" />}
              </span>
              <span className="font-medium text-ink">{o.title}</span>
            </div>
            <p className="text-sm text-ink-muted mt-2">{o.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
