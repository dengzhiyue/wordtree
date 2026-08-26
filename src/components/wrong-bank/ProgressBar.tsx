import { cn } from '@/utils/cn';

export default function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={cn('h-2 rounded-full bg-surface-muted overflow-hidden', className)}>
      <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
