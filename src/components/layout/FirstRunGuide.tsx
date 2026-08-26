import { Sparkles } from 'lucide-react';

export default function FirstRunGuide({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="mb-6 p-4 rounded-xl border border-brand/30 bg-brand-soft/50 text-ink animate-fadeIn">
      <div className="flex items-start gap-3">
        <Sparkles className="text-brand shrink-0 mt-0.5" size={22} />
        <div className="flex-1">
          <div className="font-semibold">欢迎使用 RecurWords！</div>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            开始之前，请先到「设置」页填写 LLM API Key（用于兜底释义与中文语义判定）。
            如果你有 Oxford Dictionaries 的 app_id / app_key，也建议一并填写以获得最准确的释义。
            手机使用时可在浏览器中点击「添加到主屏幕」，像原生 App 一样全屏使用。
          </p>
        </div>
        <button
          type="button"
          onClick={onSetup}
          className="h-10 px-4 text-sm rounded-md bg-brand text-white hover:opacity-90 transition touch-target whitespace-nowrap"
        >
          前往设置
        </button>
      </div>
    </div>
  );
}
