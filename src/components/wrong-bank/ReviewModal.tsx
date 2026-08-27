import { useEffect, useMemo, useState } from 'react';
import { X, ChevronDown, ChevronRight, Compass } from 'lucide-react';
import type { WordNode } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { uid } from '@/utils/text';
import { fetchWord } from '@/services/wordFetcher';
import { judgeMatch } from '@/services/semanticJudge';
import RecursivePanel from '@/components/lookup/RecursivePanel';
import NavTree from '@/components/lookup/NavTree';
import ProgressBar from './ProgressBar';
import ResultToast from '@/components/layout/ResultToast';

function findNode(root: WordNode | null, id: string): WordNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  for (const c of root.children) {
    const r = findNode(c, id);
    if (r) return r;
  }
  return null;
}

function updateNode(root: WordNode, id: string, updater: (n: WordNode) => WordNode): WordNode {
  const n = root.id === id ? updater(root) : root;
  return { ...n, children: n.children.map((c) => updateNode(c, id, updater)) };
}

export default function ReviewModal({ onClose }: { onClose: () => void }) {
  const session = useAppStore((s) => s.reviewSession);
  const advance = useAppStore((s) => s.advanceReview);
  const settings = useAppStore((s) => s.settings);
  const recordResult = useAppStore((s) => s.recordResult);

  const record = session?.queue[session.index];

  const [phase, setPhase] = useState<'loading' | 'browsing' | 'testing' | 'result'>('loading');
  const [root, setRoot] = useState<WordNode | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState<{
    ok: boolean;
    mastered: boolean;
    degraded: boolean;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    total: number;
    correct: number;
    mastered: number;
  } | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);

  const idx = session?.index ?? 0;
  const total = session?.queue.length ?? 0;
  const done = !!session && idx >= total;

  const loadWord = async (w: string) => {
    setPhase('loading');
    setResult(null);
    setErr(null);
    setUserAnswer('');
    try {
      const res = await fetchWord(w, settings);
      const node: WordNode = {
        id: 'r-' + uid(),
        word: w,
        englishDefinition: res.englishDefinition,
        chineseMeanings: res.chineseMeanings,
        children: [],
        expanded: true,
        depth: 0,
        parentId: null,
        source: res.source,
      };
      setRoot(node);
      setFocusId(node.id);
      setPhase('browsing');
    } catch (e) {
      setErr((e as Error).message || '加载失败');
      setPhase('browsing');
    }
  };

  useEffect(() => {
    if (record) loadWord(record.word);
  }, [record?.word]);

  const onWordClick = async (pid: string, word: string) => {
    if (!root) return;
    const parent = findNode(root, pid);
    if (!parent) return;
    const same = parent.children.find((c) => c.word.toLowerCase() === word.toLowerCase());
    if (same) {
      const nroot = updateNode(root, same.id, (n) => ({ ...n, expanded: true }));
      setRoot(nroot);
      setFocusId(same.id);
      return;
    }
    try {
      const res = await fetchWord(word, settings);
      const newNode: WordNode = {
        id: 'n-' + uid(),
        word,
        englishDefinition: res.englishDefinition,
        chineseMeanings: res.chineseMeanings,
        children: [],
        expanded: true,
        depth: parent.depth + 1,
        parentId: parent.id,
        source: res.source,
      };
      const nroot = updateNode(root, pid, (n) => ({
        ...n,
        children: [...n.children, newNode],
      }));
      setRoot(nroot);
      setFocusId(newNode.id);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const onCollapse = (nid: string) => {
    if (!root) return;
    setRoot(updateNode(root, nid, (n) => ({ ...n, expanded: false, children: [] })));
  };

  const collapseForTest = () => {
    if (!root) return;
    const map = (n: WordNode, keep: boolean): WordNode => ({
      ...n,
      expanded: keep,
      children: keep ? n.children.map((c) => map(c, false)) : [],
    });
    setRoot(map(root, true));
  };

  const submitCheck = async () => {
    if (!record || !root || !userAnswer.trim()) return;
    const res = await judgeMatch({
      word: record.word,
      userAnswer,
      correctAnswers: root.chineseMeanings,
      settings,
    }).catch(() => ({ ok: false, degraded: true }));
    const { masteredThisRound } = recordResult({
      word: record.word,
      correctAnswers: root.chineseMeanings,
      userAnswer,
      isCorrect: res.ok,
      targetCorrect: settings.targetCorrect,
    });
    setResult({ ok: res.ok, mastered: masteredThisRound, degraded: res.degraded });
    setPhase('result');
  };

  const onJump = (id: string) => {
    setFocusId(id);
    document.getElementById(`rvw-${id}`)?.scrollIntoView({ behavior: 'smooth' });
    if (window.innerWidth < 1024) setTreeOpen(false);
  };

  const progressPct = total === 0 ? 0 : Math.min(100, (idx / total) * 100);

  const next = () => {
    const totalCorrect = (summary?.correct ?? 0) + (result?.ok ? 1 : 0);
    const totalMastered = (summary?.mastered ?? 0) + (result?.mastered ? 1 : 0);
    const totalDone = idx + 1;
    setSummary({ total: totalDone, correct: totalCorrect, mastered: totalMastered });
    advance();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4 bg-ink/40 dark:bg-black/60 animate-fadeIn">
      <div className="w-full max-w-6xl max-h-screen sm:max-h-[94vh] overflow-hidden sm:rounded-2xl bg-surface border-0 sm:border sm:border-stroke sm:shadow-xl flex flex-col pb-safe-bottom">
        <header className="p-4 sm:p-4 border-b border-stroke flex items-center gap-3 pt-safe-top">
          <div className="flex-1 min-w-0">
            <div className="font-semibold">错词复习</div>
            <div className="text-xs text-ink-muted mt-0.5 truncate">
              第 {Math.min(idx + 1, total)} / {total} · 按「错误多 + 久未复习」优先
            </div>
            <ProgressBar className="mt-2 max-w-md" value={progressPct} max={100} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target p-2 rounded-md hover:bg-surface-muted text-ink-muted flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {done && summary ? (
            <div className="max-w-xl mx-auto text-center py-10 space-y-4 animate-pop">
              <div className="text-5xl">🎉</div>
              <h2 className="text-2xl font-semibold">复习完成！</h2>
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="p-4 rounded-xl border border-stroke">
                  <div className="text-ink-muted text-xs">复习总数</div>
                  <div className="text-xl font-semibold">{summary.total}</div>
                </div>
                <div className="p-4 rounded-xl border border-stroke">
                  <div className="text-ink-muted text-xs">答对</div>
                  <div className="text-xl font-semibold text-success">{summary.correct}</div>
                </div>
                <div className="p-4 rounded-xl border border-stroke">
                  <div className="text-ink-muted text-xs">本轮攻克</div>
                  <div className="text-xl font-semibold text-brand">{summary.mastered}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 h-12 w-full sm:w-auto px-5 rounded-lg bg-brand text-white hover:opacity-90 touch-target"
              >
                完成
              </button>
            </div>
          ) : record && root ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 lg:gap-6 items-start">
                {/* Mobile accordion */}
                <div className="lg:hidden">
                  <button
                    type="button"
                    onClick={() => setTreeOpen((v) => !v)}
                    className="w-full h-12 px-4 rounded-xl border border-stroke bg-surface flex items-center gap-2 text-ink"
                  >
                    <Compass size={18} className="text-brand" />
                    <span className="font-medium">导航树</span>
                    {treeOpen ? (
                      <ChevronDown size={18} className="ml-auto text-ink-muted" />
                    ) : (
                      <ChevronRight size={18} className="ml-auto text-ink-muted" />
                    )}
                  </button>
                  {treeOpen && (
                    <div className="mt-3 animate-slideDown">
                      <NavTree root={root} focusId={focusId} onJump={onJump} />
                    </div>
                  )}
                </div>
                <aside className="hidden lg:block lg:sticky lg:top-0">
                  <NavTree root={root} focusId={focusId} onJump={onJump} />
                </aside>
                <div>
                  {phase === 'browsing' && (
                    <>
                      <RecursivePanel
                        root={root}
                        idPrefix="rvw-"
                        onWordClick={onWordClick}
                        onCollapse={onCollapse}
                        focusNodeId={focusId}
                        onFocus={setFocusId}
                      />
                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={() => {
                            collapseForTest();
                            setPhase('testing');
                          }}
                          className="h-12 w-full sm:w-auto sm:h-11 sm:px-5 px-4 rounded-lg bg-brand text-white font-medium hover:opacity-90 touch-target"
                        >
                          我已理解，开始自测
                        </button>
                      </div>
                    </>
                  )}
                  {phase === 'testing' && (
                    <div className="max-w-2xl mx-auto rounded-2xl border border-stroke p-5">
                      <div className="text-sm text-ink-muted">请输入下面单词的中文意思</div>
                      <div className="font-serif-en text-3xl font-semibold mt-1">{record.word}</div>
                      <form
                        className="mt-5 flex flex-col gap-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitCheck();
                        }}
                      >
                        <input
                          autoFocus
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder="你的理解…"
                          className="w-full h-12 px-3 rounded-lg bg-surface-muted border border-stroke outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-base"
                        />
                        <button
                          type="submit"
                          disabled={!userAnswer.trim()}
                          className="h-12 w-full px-5 rounded-lg bg-brand text-white font-medium disabled:opacity-60 hover:opacity-90 touch-target"
                        >
                          核对
                        </button>
                      </form>
                    </div>
                  )}
                  {phase === 'result' && result && (
                    <div className="max-w-2xl mx-auto space-y-4">
                      <div className="rounded-2xl border border-stroke p-5">
                        <div className="font-serif-en text-2xl font-semibold">{record.word}</div>
                        <ul className="mt-3 list-disc pl-5 space-y-1">
                          {root.chineseMeanings.length ? (
                            root.chineseMeanings.map((c, i) => <li key={i}>{c}</li>)
                          ) : (
                            <li className="text-ink-muted">（无中文释义）</li>
                          )}
                        </ul>
                      </div>
                      {result.mastered ? (
                        <ResultToast kind="mastered" title="恭喜！该词已攻克，移出单词库 🎉" />
                      ) : result.ok ? (
                        <ResultToast kind="correct" title="回答正确！离攻克又近一步" />
                      ) : (
                        <ResultToast
                          kind="wrong"
                          title="答错，已记入单词库"
                          desc={result.degraded ? '（语义服务降级，使用近似判定）' : undefined}
                        />
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={next}
                          className="h-12 w-full sm:w-auto sm:h-11 sm:px-5 px-5 rounded-lg bg-brand text-white hover:opacity-90 touch-target"
                        >
                          {idx + 1 >= total ? '查看总结' : '下一个 →'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {err && <ResultToast kind="warn" title="小提示" desc={err} />}
            </div>
          ) : (
            <div className="text-ink-muted text-center py-20">加载中…</div>
          )}
        </div>
      </div>
    </div>
  );
}
