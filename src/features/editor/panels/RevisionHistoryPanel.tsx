import { useEffect, useState } from 'react';
import { History, RotateCcw, Clock, X, Plus } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { getRevisions } from '../../../services/boardService';
import type { BoardRevision } from '../../../services/boardService';
import { useEditorStore } from '../store';
import { useToast } from '../../../hooks/useToast';

interface RevisionHistoryPanelProps {
  boardId: string;
  onClose: () => void;
}

export const RevisionHistoryPanel = ({ boardId, onClose }: RevisionHistoryPanelProps) => {
  const [revisions, setRevisions] = useState<BoardRevision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    getRevisions(boardId)
      .then(setRevisions)
      .catch(() => addToast('履歴の取得に失敗しました', 'danger'))
      .finally(() => setIsLoading(false));
  }, [boardId, addToast]);

  const handleRestore = (rev: BoardRevision) => {
    if (!window.confirm(`「${rev.note || '過去の状態'}」を復元しますか？\n現在の未保存の編集内容は失われます。`)) return;

    useEditorStore.setState({
      nodes: rev.nodes,
      edges: rev.edges,
      boardSettings: rev.settings,
      past: [],
      future: [],
    });
    addToast('リビジョンを復元しました', 'success');
    onClose();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '不明';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pointer-events-auto" onClick={onClose}>
      <GlassCard className="w-full max-w-md p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <History className="w-6 h-6 text-purple-500" />
          バージョン履歴
        </h2>

        <button
          onClick={() => {
            window.dispatchEvent(new Event('create-revision'));
          }}
          className="w-full mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-dashed border-purple-300 text-purple-700 font-bold hover:from-purple-500/20 hover:to-pink-500/20 transition-all flex items-center justify-center gap-2 shadow-sm group"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          現在の状態を保存する
        </button>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading && <div className="text-center py-10 text-slate-400">読み込み中...</div>}
          {!isLoading && revisions.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              履歴がまだありません。<br />「リビジョンを保存」から現在の状態を記録できます。
            </div>
          )}
          {revisions.map((rev) => (
            <button
              key={rev.id}
              onClick={() => handleRestore(rev)}
              className="w-full text-left p-4 rounded-2xl bg-white/60 hover:bg-white border border-transparent hover:border-purple-200 transition-all group shadow-sm"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                  {rev.note || '自動バックアップ'}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(rev.createdAt)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {rev.nodes.length}マス / {rev.edges.length}ルート
              </p>
              <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-bold text-purple-500 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" />
                  復元する
                </span>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-6 text-[10px] text-slate-400 text-center">
          ※ リビジョンは最大20件まで保存されます。
        </p>
      </GlassCard>
    </div>
  );
};
