import StatsBanner from './StatsBanner';
import WrongWordTable from './WrongWordTable';
import ReviewModal from './ReviewModal';
import { useAppStore } from '@/store/useAppStore';
import { PlayCircle } from 'lucide-react';

export default function WrongBankPage() {
  const build = useAppStore((s) => s.buildReviewQueue);
  const startReview = useAppStore((s) => s.startReview);
  const closeReview = useAppStore((s) => s.closeReview);
  const session = useAppStore((s) => s.reviewSession);
  const pending = useAppStore((s) => s.wrongWords.length);

  const onStart = () => {
    const q = build();
    if (!q.length) {
      alert('暂无可复习的错题～先去查单词答错几个试试！');
      return;
    }
    startReview(q);
  };

  const onSingleTest = (word: string) => {
    const one = useAppStore.getState().wrongWords.filter((w) => w.word === word);
    if (!one.length) return;
    startReview(one);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">错题库</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            答错的词会自动入库，连续答对 N 次后自动攻克（默认 3，可在设置中调整）
          </p>
        </div>
        <button
          type="button"
          onClick={onStart}
          disabled={pending === 0}
          className="h-12 w-full sm:w-auto px-5 rounded-lg bg-brand text-white font-medium disabled:opacity-60 hover:opacity-90 transition inline-flex items-center justify-center gap-2 touch-target"
        >
          <PlayCircle size={20} /> 开始复习（{pending}）
        </button>
      </div>

      <StatsBanner />
      <WrongWordTable onSingleTest={onSingleTest} />
      {session && <ReviewModal onClose={closeReview} />}
    </div>
  );
}
