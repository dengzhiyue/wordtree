import { useAppStore } from '@/store/useAppStore';

function Ring({ rate }: { rate: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const off = c * (1 - rate);
  return (
    <svg viewBox="0 0 120 120" className="w-20 h-20 mx-auto">
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-stroke"
        strokeWidth="10"
      />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-brand"
        strokeWidth="10"
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        strokeDasharray={c}
        strokeDashoffset={off}
        style={{ transition: 'stroke-dashoffset .4s ease' }}
      />
      <text
        x="60"
        y="60"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-current text-ink font-semibold"
        fontSize="18"
      >
        {Math.round(rate * 100)}%
      </text>
    </svg>
  );
}

export default function StatsBanner() {
  const wrong = useAppStore((s) => s.wrongWords);
  const mastered = useAppStore((s) => s.masteredWords);
  const totalEver = new Set([...wrong.map((w) => w.word), ...mastered.map((m) => m.word)]).size;
  const masteredCount = mastered.length;
  const pending = wrong.length;
  const rate = totalEver === 0 ? 0 : masteredCount / totalEver;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: '错题总数', value: wrong.length, tone: 'text-ink' },
        { label: '已攻克', value: masteredCount, tone: 'text-success' },
        { label: '待复习', value: pending, tone: 'text-brand' },
      ].map((k) => (
        <div
          key={k.label}
          className="rounded-xl border border-stroke bg-surface p-4 flex flex-col justify-between"
        >
          <div className="text-sm text-ink-muted">{k.label}</div>
          <div className={`text-2xl font-semibold ${k.tone}`}>{k.value}</div>
        </div>
      ))}
      <div className="rounded-xl border border-stroke bg-surface p-4 flex flex-col items-center">
        <div className="text-sm text-ink-muted w-full">掌握率</div>
        <Ring rate={rate} />
      </div>
    </div>
  );
}
