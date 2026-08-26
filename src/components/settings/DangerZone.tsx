import { Storage } from '@/services/storage';
import { AlertTriangle } from 'lucide-react';

export default function DangerZone() {
  const wipe = () => {
    const ok1 = confirm('⚠️ 真的要清空所有数据吗？\n（错题、已掌握、学习历史、全部设置都会被删除！）');
    if (!ok1) return;
    const v = window.prompt('请输入 DELETE 确认：');
    if (v !== 'DELETE') return;
    Storage.resetAll();
    alert('已清空全部数据，页面将刷新。');
    location.reload();
  };
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-danger shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-danger">危险操作：清空所有数据</div>
          <p className="text-sm text-ink-muted mt-1">
            包含：错题库、已掌握、学习历史、全部设置。操作不可恢复！
          </p>
        </div>
        <button
          type="button"
          onClick={wipe}
          className="h-10 px-4 rounded-md bg-danger text-white hover:opacity-90"
        >
          清空所有数据
        </button>
      </div>
    </div>
  );
}
