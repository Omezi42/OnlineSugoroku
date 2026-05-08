import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, Copy, Globe2, Loader2, Play, RotateCcw, X, Home } from 'lucide-react';
import { Canvas } from './canvas/Canvas';
import { Sidebar } from './panels/Sidebar';
import { NodeConfigPanel } from './panels/NodeConfigPanel';
import { EditorToolbar } from './components/EditorToolbar';
import { useEditorStore } from './store';
import { canEditBoard, loadBoard, saveBoard } from '../../services/boardService';
import { GlassCard } from '../../components/ui/GlassCard';
import { validateBoard } from './utils/boardValidation';
import { useAuthUser } from '../../hooks/useAuthUser';
import { getLocalOwnerId } from '../../services/localIdentity';

const categories = [
  { value: 'party', label: 'パーティー' },
  { value: 'learning', label: '学習' },
  { value: 'story', label: 'ストーリー' },
  { value: 'challenge', label: 'チャレンジ' },
];

export default function Editor() {
  const navigate = useNavigate();
  const { boardId: routeBoardId } = useParams();
  const draftKey = useMemo(() => `online-sugoroku-editor-draft-${routeBoardId || 'new'}`, [routeBoardId]);
  const localOwnerId = useMemo(() => getLocalOwnerId(), []);
  const { user } = useAuthUser();
  const { nodes, edges, boardSettings } = useEditorStore();
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(routeBoardId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingBoard, setIsLoadingBoard] = useState(Boolean(routeBoardId));
  const [boardName, setBoardName] = useState('無題のすごろく');
  const [boardDescription, setBoardDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [category, setCategory] = useState('party');
  const [isPublic, setIsPublic] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [savedBoardId, setSavedBoardId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(() => Boolean(localStorage.getItem(draftKey)));

  useEffect(() => {
    if (!routeBoardId) return;
    let cancelled = false;
    loadBoard(routeBoardId)
      .then((board) => {
        if (cancelled) return;
        if (!board) {
          alert('編集する盤面が見つかりませんでした。');
          navigate('/editor');
          return;
        }
        const editable = canEditBoard(board, user?.uid, localOwnerId);
        setCanEdit(editable);
        useEditorStore.setState({
          nodes: board.nodes,
          edges: board.edges,
          boardSettings: board.settings,
          past: [],
          future: [],
          clipboard: null,
        });
        setCurrentBoardId(board.id || routeBoardId);
        setBoardName(board.name || '無題のすごろく');
        setBoardDescription(board.description || '');
        setAuthorName(board.authorName || '');
        setCategory(board.category || 'party');
        setIsPublic(Boolean(board.isPublic));
        setDraftAvailable(Boolean(localStorage.getItem(draftKey)));
        if (!editable) {
          alert('この盤面は閲覧できます。保存すると、自分用のコピーとして作成します。');
        }
      })
      .catch(() => {
        if (!cancelled) alert('盤面の読み込みに失敗しました。');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingBoard(false);
      });
    return () => { cancelled = true; };
  }, [draftKey, localOwnerId, navigate, routeBoardId, user?.uid]);

  useEffect(() => {
    if (draftAvailable || isLoadingBoard) return;
    const draft = {
      savedAt: new Date().toISOString(),
      boardId: currentBoardId,
      name: boardName,
      description: boardDescription,
      authorName,
      category,
      isPublic,
      nodes,
      edges,
      settings: boardSettings,
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [authorName, boardDescription, boardName, boardSettings, category, currentBoardId, draftAvailable, draftKey, edges, isLoadingBoard, isPublic, nodes]);

  const handleRestoreDraft = () => {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      useEditorStore.setState({
        nodes: draft.nodes,
        edges: draft.edges,
        boardSettings: draft.settings,
        past: [],
        future: [],
        clipboard: null,
      });
      setCurrentBoardId(draft.boardId || routeBoardId || null);
      setBoardName(draft.name || '無題のすごろく');
      setBoardDescription(draft.description || '');
      setAuthorName(draft.authorName || '');
      setCategory(draft.category || 'party');
      setIsPublic(Boolean(draft.isPublic));
      setDraftAvailable(false);
    } catch {
      alert('下書きの復元に失敗しました。');
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(draftKey);
    setDraftAvailable(false);
  };

  const handleSave = async () => {
    const validation = validateBoard(nodes, edges);
    if (!validation.ok) {
      alert(`保存前チェックでエラーが見つかりました。\n\n${validation.errors.join('\n')}`);
      return;
    }
    if (validation.warnings.length > 0) {
      const shouldContinue = window.confirm(`警告がありますが保存しますか？\n\n${validation.warnings.slice(0, 6).join('\n')}`);
      if (!shouldContinue) return;
    }

    try {
      setIsSaving(true);
      const ownerId = user?.uid || localOwnerId;
      const ownerName = user?.displayName || user?.email || authorName || 'ローカルユーザー';
      const boardId = await saveBoard({
        id: canEdit ? currentBoardId || undefined : undefined,
        name: boardName,
        description: boardDescription,
        authorName: authorName || ownerName,
        ownerId,
        ownerName,
        category,
        nodes,
        edges,
        settings: boardSettings,
        isPublic,
      });
      setCanEdit(true);
      setCurrentBoardId(boardId);
      setSavedBoardId(boardId);
      localStorage.removeItem(draftKey);
      setDraftAvailable(false);
    } catch (error) {
      console.error('Failed to save board:', error);
      alert('保存に失敗しました。Firebaseの権限設定も確認してください。');
    } finally {
      setIsSaving(false);
    }
  };

  const shareUrl = savedBoardId ? `${window.location.origin}${import.meta.env.BASE_URL}play/${savedBoardId}` : '';

  const handleTestPlay = () => {
    if (!savedBoardId) return;
    navigate(`/play/${savedBoardId}/test-${Date.now().toString(36)}`);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-full bg-slate-50 overflow-hidden relative">
        {isLoadingBoard && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="glass-panel rounded-2xl px-6 py-4 flex items-center gap-3 font-bold text-slate-700 shadow-xl">
              <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              盤面を読み込み中...
            </div>
          </div>
        )}
        <Sidebar />
        <Canvas />
        <NodeConfigPanel />
        <EditorToolbar />

        {draftAvailable && (
          <div className="absolute top-20 left-72 z-30 pointer-events-auto">
            <div className="glass-panel rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-800">前回の下書きがあります</p>
                <p className="text-xs text-slate-500">未保存の編集内容を復元できます。</p>
              </div>
              <button onClick={handleRestoreDraft} className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                復元
              </button>
              <button onClick={handleDiscardDraft} className="px-3 py-1.5 rounded-xl bg-white/70 text-slate-600 text-xs font-bold hover:bg-white transition-colors">
                破棄
              </button>
            </div>
          </div>
        )}

        <div className="absolute top-4 left-72 right-4 flex flex-wrap justify-between items-start pointer-events-none gap-3">
          <div className="flex flex-wrap gap-2 pointer-events-auto">
            <button
              onClick={() => navigate('/')}
              className="glass-panel px-3 py-3 rounded-xl shadow-sm text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center h-[52px]"
              title="ホームに戻る"
            >
              <Home className="w-5 h-5" />
            </button>
            <div className="glass-panel px-4 py-3 rounded-xl shadow-sm flex flex-col gap-2 min-w-[280px]">
              <input
                type="text"
                value={boardName}
                onChange={(event) => setBoardName(event.target.value)}
                className="font-bold text-slate-800 bg-transparent outline-none w-full"
                placeholder="盤面の名前"
              />
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={boardDescription}
                  onChange={(event) => setBoardDescription(event.target.value)}
                  className="text-xs text-slate-500 bg-transparent outline-none flex-1 min-w-[120px]"
                  placeholder="説明を追加"
                  maxLength={80}
                />
                <input
                  type="text"
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  className="text-xs text-slate-500 bg-transparent outline-none w-24"
                  placeholder="作者名"
                  maxLength={24}
                />
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="text-xs text-slate-600 bg-white/60 rounded-lg px-2 py-0.5 outline-none"
                >
                  {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              {!canEdit && <p className="text-xs font-bold text-amber-600">編集権限がないため、保存時にコピーを作成します。</p>}
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-3">
            <label className="glass-panel px-3 py-2 rounded-xl shadow-sm flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
              />
              <Globe2 className="w-4 h-4 text-purple-500" />
              公開ギャラリーに表示
            </label>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-70"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? '保存中...' : '保存してプレイ'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {savedBoardId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-md">
                <GlassCard className="p-8 text-center relative">
                  <button onClick={() => setSavedBoardId(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                  <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">保存完了！</h2>
                  <p className="text-slate-500 mb-6">プレイ用URLを共有して、すぐにテストプレイできます。</p>
                  <div className={`mb-4 rounded-xl px-3 py-2 text-sm font-bold ${isPublic ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {isPublic ? '公開ギャラリーに表示されます' : '非公開で保存されています'}
                  </div>
                  <div className="bg-white/50 border border-slate-200 rounded-lg p-2 flex items-center gap-2 mb-6">
                    <input type="text" readOnly value={shareUrl} className="flex-1 bg-transparent text-sm text-slate-600 outline-none px-2" />
                    <button onClick={handleCopy} className="p-2 bg-white rounded-md text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors shadow-sm" title="URLをコピー">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={handleTestPlay} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all">
                      <Play className="w-5 h-5" />
                      今すぐテストプレイ
                    </button>
                    <button onClick={() => setSavedBoardId(null)} className="w-full py-3 bg-white text-slate-700 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-colors">
                      エディターに戻る
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ReactFlowProvider>
  );
}
