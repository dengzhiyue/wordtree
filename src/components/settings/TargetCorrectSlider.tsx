import { useAppStore } from '@/store/useAppStore';

export default function TargetCorrectSlider() {
  const v = useAppStore((s) => s.settings.targetCorrect);
  const set = useAppStore((s) => s.setSettings);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">移出错题库所需连续答对次数</span>
        <span className="font-semibold text-brand">{v} 次</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={v}
        onChange={(e) => set({ targetCorrect: Number(e.target.value) })}
        className="w-full mt-3 accent-brand"
      />
      <p className="mt-2 text-sm text-ink-muted">
        连续答对 {v} 次后，该词会自动标记为 <b>已掌握</b> 并从错题库移出。
      </p>
    </div>
  );
}
