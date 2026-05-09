import { useEffect, useState } from 'react';
import { History, RotateCcw, Clock, X, Plus } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { getRevisions, updateRevisionNote } from '../../../services/boardService';
import type { BoardRevision } from '../../../services/boardService';
import { useEditorStore } from '../store';
import { useToast } from '../../../hooks/useToast';
import { Edit3, Check } from 'lucide-react';

interface RevisionHistoryPanelProps {
  boardId: string;
  onClose: () => void;
}

export const RevisionHistoryPanel = ({ boardId, onClose }: RevisionHistoryPanelProps) => {
  const [revisions, setRevisions] = useState<BoardRevision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    getRevisions(boardId)
      .then(setRevisions)
      .catch(() => addToast('履歴の取得に失敗しました', 'danger'))
      .finally(() => setIsLoading(false));
  }, [boardId, addToast]);

  const handleRestore = (rev: BoardRevision) => {
    if (editingId) return; // 編集中の場合はスキップ
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

  const handleUpdateNote = async (id: string) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await updateRevisionNote(boardId, id, editValue);
      setRevisions(revisions.map(r => r.id === id ? { ...r, note: editValue } : r));
      setEditingId(null);
      addToast('メモを更新しました', 'success');
    } catch {
      addToast('メモの更新に失敗しました', 'danger');
    }
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
            <div
              key={rev.id}
              className="group relative"
            >
              <button
                onClick={() => handleRestore(rev)}
                className={`w-full text-left p-4 rounded-2xl bg-white/60 hover:bg-white border border-transparent hover:border-purple-200 transition-all shadow-sm ${
                  editingId === rev.id ? 'ring-2 ring-purple-400' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1 mr-2">
                    {editingId === rev.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateNote(rev.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-full text-sm font-bold text-slate-800 bg-white border border-purple-200 rounded-lg px-2 py-1 outline-none"
                          placeholder="メモを入力..."
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateNote(rev.id);
                          }}
                          className="p-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors block truncate">
                        {rev.note || '自動バックアップ'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDate(rev.createdAt)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {rev.nodes.length}マス / {rev.edges.length}ルート
                </p>
                <div className="mt-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(rev.id);
                      setEditValue(rev.note || '');
                    }}
                    className="text-[10px] text-slate-400 hover:text-purple-500 flex items-center gap-1 font-bold"
                  >
                    <Edit3 className="w-3 h-3" />
                    メモを編集
                  </button>
                  <span className="text-xs font-bold text-purple-500 flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" />
                    復元する
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[10px] text-slate-400 text-center">
          ※ リビジョンは最大20件まで保存されます。
        </p>
      </GlassCard>
    </div>
  );
};
