import { useAppStore } from '@/store/useAppStore';
import ResultToast, { ToastKind } from '@/components/layout/ResultToast';
import { useEffect, useState } from 'react';
import { takeLastMasteredFlag } from '@/store/useAppStore';
import { ArrowRight, RotateCcw } from 'lucide-react';

export default function SelfTestCard() {
  const st = useAppStore((s) => s.selfTest);
  const phase = useAppStore((s) => s.phase);
  const err = useAppStore((s) => s.errorMsg);
  const setAnswer = useAppStore((s) => s.setUserAnswer);
  const check = useAppStore((s) => s.checkAnswer);
  const reset = useAppStore((s) => s.resetTree);
  const goTest = useAppStore((s) => s.enterTest);

  const [mastered, setMastered] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (phase === 'result') {
      setShowResult(true);
      setMastered(takeLastMasteredFlag());
    } else {
      setShowResult(false);
      setMastered(false);
    }
  }, [phase]);

  if (!st) return null;

  const toast: { kind: ToastKind; title: string; desc?: string } | null = showResult
    ? mastered
      ? { kind: 'mastered', title: '恭喜！该词已攻克，已移出错题库 🎉' }
      : st.isCorrect
        ? { kind: 'correct', title: '回答正确！' }
        : { kind: 'wrong', title: '回答错误，已加入错题库', desc: '不要灰心，递归理解每个词再试试。' }
    : null;

  const warn = err && phase === 'result'
    ? { kind: 'warn' as const, title: '提示', desc: err }
    : null;

  return (
    <div className="rounded-2xl border border-stroke bg-surface p-5 sm:p-6 animate-fadeIn">
      {phase === 'testing' && (
        <>
          <div className="text-sm text-ink-muted">请输入你认为下面单词的中文意思</div>
          <div className="font-serif-en text-3xl sm:text-4xl font-semibold mt-1 text-ink tracking-wide">
            {st.word}
          </div>
          <form
            className="mt-5 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              check();
            }}
          >
            <input
              autoFocus
              value={st.userAnswer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="如：递归的、循环的"
              className="w-full h-12 px-3 rounded-lg bg-surface-muted border border-stroke focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-ink placeholder:text-ink-muted text-base"
            />
            <button
              type="submit"
              disabled={!st.userAnswer.trim()}
              className="h-12 w-full px-5 rounded-lg bg-brand text-white font-medium disabled:opacity-60 hover:opacity-90 transition inline-flex items-center gap-2 justify-center touch-target"
            >
              核对答案 <ArrowRight size={18} />
            </button>
          </form>
        </>
      )}

      {phase === 'result' && (
        <div className="space-y-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-serif-en text-2xl font-semibold">{st.word}</span>
            <span className="text-sm text-ink-muted">牛津中文释义：</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-ink">
            {st.correctAnswers.length ? (
              st.correctAnswers.map((c, i) => <li key={i}>{c}</li>)
            ) : (
              <li className="text-ink-muted">（未取到中文释义）</li>
            )}
          </ul>
          {toast && <ResultToast kind={toast.kind} title={toast.title} desc={toast.desc} />}
          {warn && <ResultToast kind={warn.kind} title={warn.title} desc={warn.desc} />}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowResult(false);
                goTest();
              }}
              className="h-12 px-4 rounded-lg border border-stroke hover:bg-surface-muted transition inline-flex items-center justify-center gap-2 touch-target"
            >
              <RotateCcw size={18} /> 重试
            </button>
            <button
              type="button"
              onClick={reset}
              className="h-12 px-5 rounded-lg bg-brand text-white hover:opacity-90 transition touch-target flex-1 sm:flex-initial"
            >
              再来一个词
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
