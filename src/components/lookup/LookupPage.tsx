import { useState } from 'react';
import WordInput from './WordInput';
import NavTree from './NavTree';
import RecursivePanel from './RecursivePanel';
import DepthIndicator from './DepthIndicator';
import SelfTestCard from './SelfTestCard';
import ResultToast from '@/components/layout/ResultToast';
import { useAppStore } from '@/store/useAppStore';
import { ChevronDown, ChevronRight, Compass } from 'lucide-react';

export default function LookupPage() {
  const root = useAppStore((s) => s.rootNode);
  const phase = useAppStore((s) => s.phase);
  const err = useAppStore((s) => s.errorMsg);
  const focusId = useAppStore((s) => s.focusNodeId);
  const expand = useAppStore((s) => s.expandChild);
  const collapse = useAppStore((s) => s.collapseChild);
  const setFocus = useAppStore((s) => s.setFocus);
  const enterTest = useAppStore((s) => s.enterTest);

  const [treeOpen, setTreeOpen] = useState(false);

  const jump = (id: string) => {
    setFocus(id);
    const el = document.getElementById(`node-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (window.innerWidth < 1024) setTreeOpen(false);
  };

  const showTree = root && phase !== 'testing' && phase !== 'result';

  return (
    <div className="space-y-5">
      <WordInput />

      {err && phase !== 'result' && <ResultToast kind="warn" title="提示" desc={err} />}

      {phase === 'idle' && !root && (
        <div className="rounded-2xl border border-dashed border-stroke p-6 sm:p-8 text-center text-ink-muted">
          <div className="text-4xl mb-2">🔁</div>
          <div className="font-medium text-ink mb-1">递归式英文释义学习</div>
          <p className="text-sm max-w-xl mx-auto leading-relaxed">
            输入一个英文单词 → 看到英文释义 → 点不认识的词继续深挖 → 层层理解直到全部看懂 →
            回到原词自测中文意思 → 答错自动进入错题库。
          </p>
        </div>
      )}

      {root && phase !== 'testing' && phase !== 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 lg:gap-6 items-start">
          {/* Mobile: collapse panel */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setTreeOpen((v) => !v)}
              className="w-full h-12 px-4 rounded-xl border border-stroke bg-surface flex items-center gap-2 text-ink"
            >
              <Compass size={18} className="text-brand" />
              <span className="font-medium">导航树 · 深度指示</span>
              {treeOpen ? (
                <ChevronDown size={18} className="ml-auto text-ink-muted" />
              ) : (
                <ChevronRight size={18} className="ml-auto text-ink-muted" />
              )}
            </button>
            {treeOpen && (
              <div className="mt-3 space-y-3 animate-slideDown">
                <NavTree root={root} focusId={focusId} onJump={jump} />
                <DepthIndicator root={root} />
              </div>
            )}
          </div>

          {/* Desktop: sticky sidebars */}
          <aside className="hidden lg:block lg:sticky lg:top-24 space-y-4">
            <NavTree root={root} focusId={focusId} onJump={jump} />
            <DepthIndicator root={root} />
          </aside>

          <div>
            {phase === 'browsing' && (
              <>
                <RecursivePanel
                  root={root}
                  onWordClick={expand}
                  onCollapse={collapse}
                  focusNodeId={focusId}
                  onFocus={setFocus}
                />
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={enterTest}
                    className="h-12 w-full sm:w-auto sm:h-11 sm:px-5 px-4 rounded-lg bg-brand text-white font-medium hover:opacity-90 transition touch-target"
                  >
                    我已理解，开始测试
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {(phase === 'testing' || phase === 'result') && (
        <div className="max-w-2xl mx-auto">
          <SelfTestCard />
        </div>
      )}
    </div>
  );
}
