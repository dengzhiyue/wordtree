import { Check, X, PartyPopper, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ToastKind = 'correct' | 'wrong' | 'mastered' | 'warn';

export default function ResultToast({
  kind,
  title,
  desc,
}: {
  kind: ToastKind;
  title: string;
  desc?: string;
}) {
  const styles = {
    correct: 'border-success/40 bg-success/10 text-success',
    wrong: 'border-danger/40 bg-danger/10 text-danger',
    mastered: 'border-brand/40 bg-brand-soft text-brand',
    warn:
      'border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  }[kind];
  const Icon =
    kind === 'correct' ? Check : kind === 'wrong' ? X : kind === 'mastered' ? PartyPopper : Info;
  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-xl border animate-pop', styles)}>
      <Icon size={22} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{title}</div>
        {desc && <div className="text-sm opacity-90 mt-0.5">{desc}</div>}
      </div>
    </div>
  );
}
