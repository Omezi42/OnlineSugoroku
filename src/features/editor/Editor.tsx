import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Canvas } from './canvas/Canvas';
import { Sidebar } from './panels/Sidebar';
import { NodeConfigPanel } from './panels/NodeConfigPanel';
import { EditorToolbar } from './components/EditorToolbar';
import { useEditorStore } from './store';
import { canEditBoard, loadBoard, saveBoard, subscribeToBoard, saveRevision } from '../../services/boardService';
import { GlassCard } from '../../components/ui/GlassCard';
import { History, Share2, Users, AlertCircle, Check, Copy, Globe2, Loader2, Play, RotateCcw, X, Home, Menu } from 'lucide-react';
import { RevisionHistoryPanel } from './panels/RevisionHistoryPanel';
import { EditorTutorial } from './components/EditorTutorial';
import { validateBoard } from './utils/boardValidation';
import { useAuthUser } from '../../hooks/useAuthUser';
import { getLocalOwnerId } from '../../services/localIdentity';
import { useToast } from '../../hooks/useToast';
import { checkBoardContent } from '../../utils/wordFilter';

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
  const [allowPublicEdit, setAllowPublicEdit] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [savedBoardId, setSavedBoardId] = useState<string | null>(null);
  const [draftAvailable, setDraftAvailable] = useState(() => Boolean(localStorage.getItem(draftKey)));
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced'>('idle');
  const [showRevisions, setShowRevisions] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('has_seen_editor_tutorial'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { addToast } = useToast();

  const location = useLocation();
  const isUpdatingFromRemote = useRef(false);
  const lastLocalUpdate = useRef(0);

  useEffect(() => {
    if (!routeBoardId) {
      // 新規作成の場合、テンプレートの指定があれば適用
      const params = new URLSearchParams(location.search);
      const template = params.get('template');
      if (template) {
        useEditorStore.getState().applyTemplate(template as any);
        setBoardName('テンプレートから作成');
      }
      return;
    }
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
        setAllowPublicEdit(Boolean(board.allowPublicEdit));
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
      allowPublicEdit,
      nodes,
      edges,
      settings: boardSettings,
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [authorName, boardDescription, boardName, boardSettings, category, currentBoardId, draftAvailable, draftKey, edges, isLoadingBoard, isPublic, allowPublicEdit, nodes]);

  // リモートからの変更を購読（共同編集）
  useEffect(() => {
    if (!currentBoardId || isLoadingBoard || draftAvailable) return;
    const unsubscribe = subscribeToBoard(currentBoardId, (data) => {
      if (!data) return;
      // 自分が直近で保存したばかりなら上書きをスキップ（エコー防止）
      if (Date.now() - lastLocalUpdate.current < 2500) return;

      isUpdatingFromRemote.current = true;
      useEditorStore.getState().mergeRemoteState({
        nodes: data.nodes,
        edges: data.edges,
        settings: data.settings,
      });
      if (data.name !== boardName) setBoardName(data.name);
      if (data.description !== boardDescription) setBoardDescription(data.description || '');
      if (data.authorName !== authorName) setAuthorName(data.authorName || '');
      if (data.isPublic !== isPublic) setIsPublic(Boolean(data.isPublic));
      if (data.allowPublicEdit !== allowPublicEdit) setAllowPublicEdit(Boolean(data.allowPublicEdit));
      
      addToast('他のユーザーによる変更を同期しました', 'info');
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
      setTimeout(() => { isUpdatingFromRemote.current = false; }, 100);
    });
    return () => unsubscribe();
  }, [currentBoardId, isLoadingBoard, draftAvailable]);

  // 自動保存ロジック（デバウンス処理）
  useEffect(() => {
    if (!currentBoardId || isLoadingBoard || draftAvailable || isUpdatingFromRemote.current || !canEdit) return;

    setSyncStatus('saving');
    const timeoutId = setTimeout(async () => {
      try {
        lastLocalUpdate.current = Date.now();
        const ownerId = user?.uid || localOwnerId;
        const ownerName = user?.displayName || user?.email || authorName || 'ローカルユーザー';
        await saveBoard({
          id: currentBoardId,
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
          allowPublicEdit,
        });
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1500); // 1.5秒間操作がなければ保存

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, boardSettings, boardName, boardDescription, authorName, category, isPublic, allowPublicEdit, currentBoardId, isLoadingBoard, draftAvailable, canEdit]);

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
      setAllowPublicEdit(Boolean(draft.allowPublicEdit));
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

    // NGワードチェック (公開する場合のみ)
    if (isPublic) {
      const filterResult = checkBoardContent({ name: boardName, description: boardDescription, nodes });
      if (filterResult.hasNgWord) {
        alert(`不適切な可能性のある表現が含まれているため、公開できません。\n\n検出されたワード: ${filterResult.detectedWords.join(', ')}\n\n修正して再度保存してください。`);
        return;
      }
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
        allowPublicEdit,
      });
      setCanEdit(true);
      setCurrentBoardId(boardId);
      setSavedBoardId(boardId);
      localStorage.removeItem(draftKey);
      setDraftAvailable(false);
      addToast('盤面を保存しました', 'success');
    } catch (error) {
      console.error('Failed to save board:', error);
      addToast('保存に失敗しました。', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleCreateRevisionEvent = () => handleCreateRevision();
    window.addEventListener('create-revision', handleCreateRevisionEvent);
    return () => window.removeEventListener('create-revision', handleCreateRevisionEvent);
  }, [nodes, edges, boardSettings, boardName, currentBoardId, canEdit]);

  const handleCreateRevision = async () => {
    if (!currentBoardId || !canEdit) return;
    const note = window.prompt('リビジョンのメモを入力（例：公開版、バランス調整後）', '');
    if (note === null) return;
    
    try {
      setIsSaving(true);
      await saveRevision(currentBoardId, {
        name: boardName,
        nodes,
        edges,
        settings: boardSettings,
      }, note);
      addToast('リビジョンを保存しました', 'success');
    } catch {
      addToast('リビジョンの保存に失敗しました', 'danger');
    } finally {
      setIsSaving(false);
    }
  };



  const handleTestPlay = () => {
    if (!savedBoardId) return;
    navigate(`/play/${savedBoardId}/test-${Date.now().toString(36)}`);
  };

  const selectedNodeId = nodes.find(n => n.selected)?.id;

  return (
    <ReactFlowProvider>
      <div id="tutorial-root" className="flex h-screen w-full bg-slate-50 overflow-hidden relative">
        {isLoadingBoard && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="glass-panel rounded-2xl px-6 py-4 flex items-center gap-3 font-bold text-slate-700 shadow-xl">
              <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              盤面を読み込み中...
            </div>
          </div>
        )}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden fixed top-4 left-4 z-[40] glass-panel p-3 rounded-xl shadow-lg text-purple-600 active:scale-95 transition-all"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className={`
          fixed md:relative inset-y-0 left-0 z-[35] transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
          {sidebarOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-[2px] -z-10" 
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>

        <div className="flex-1 relative overflow-hidden">
          <Canvas />
          
          <AnimatePresence>
            {selectedNodeId && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="fixed md:absolute right-0 top-0 bottom-0 z-[35] w-full md:w-80"
              >
                <NodeConfigPanel onClose={() => useEditorStore.getState().setNodes(nodes.map(n => ({...n, selected: false})))} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`
            absolute top-4 left-4 md:left-4 right-4 flex flex-wrap justify-between items-start pointer-events-none gap-3
            ${sidebarOpen ? 'md:ml-0' : ''}
          `}>
            <div className="flex flex-wrap gap-2 pointer-events-auto">
              <button
                onClick={() => navigate('/')}
                className="glass-panel px-3 py-3 rounded-xl shadow-sm text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center h-[52px]"
                title="ホームに戻る"
              >
                <Home className="w-5 h-5" />
              </button>
              {currentBoardId && (
                <button
                  onClick={() => setShowRevisions(true)}
                  className="glass-panel px-3 py-3 rounded-xl shadow-sm text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center h-[52px]"
                  title="バージョン履歴"
                >
                  <History className="w-5 h-5" />
                </button>
              )}
              <div id="board-settings" className="glass-panel px-4 py-3 rounded-xl shadow-sm flex flex-col gap-2 min-w-[200px] md:min-w-[280px] max-w-[calc(100vw-120px)]">
                <input
                  type="text"
                  value={boardName}
                  onChange={(event) => setBoardName(event.target.value)}
                  className="font-bold text-slate-800 bg-transparent outline-none w-full text-sm md:text-base"
                  placeholder="盤面の名前"
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={boardDescription}
                    onChange={(event) => setBoardDescription(event.target.value)}
                    className="text-[10px] md:text-xs text-slate-500 bg-transparent outline-none flex-1 min-w-[100px]"
                    placeholder="説明を追加"
                    maxLength={80}
                  />
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="text-[10px] md:text-xs text-slate-600 bg-white/60 rounded-lg px-2 py-0.5 outline-none"
                  >
                    {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                {!canEdit && <p className="text-[10px] font-bold text-amber-600">コピーとして保存されます</p>}
                
                <div className="flex items-center gap-2 mt-1">
                  <AnimatePresence mode="wait">
                    {syncStatus === 'saving' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-white/50 px-2 py-0.5 rounded-md">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        同期中...
                      </motion.div>
                    )}
                    {syncStatus === 'synced' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                        <Check className="w-3 h-3" />
                        同期完了
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            
            <div className="pointer-events-auto flex items-center gap-2 md:gap-3">
              <button
                id="test-play-button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 md:px-6 py-2 rounded-full font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-70 text-xs md:text-sm"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? '保存中...' : '保存してプレイ'}
              </button>
              
              <div className="hidden md:flex items-center gap-2">
                <label className="glass-panel px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(event) => setIsPublic(event.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <Globe2 className="w-4 h-4 text-purple-500" />
                  公開
                </label>
                <button
                  id="share-button"
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    addToast('編集用URLをコピーしました', 'success');
                  }}
                  className="glass-panel p-2.5 rounded-xl shadow-sm text-slate-600 hover:text-purple-600 transition-colors flex items-center justify-center"
                  title="URLをコピー"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
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
                  <div className="text-left mb-1 mt-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">プレイ用URL (みんなを招待)</label>
                    <div className="bg-white/50 border border-slate-200 rounded-lg p-2 flex items-center gap-2">
                      <input type="text" readOnly value={`${window.location.origin}${window.location.pathname}#/play/${savedBoardId}/room-${Date.now().toString(36)}`} className="flex-1 bg-transparent text-sm text-slate-600 outline-none px-2" />
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/play/${savedBoardId}/room-${Date.now().toString(36)}`); addToast('プレイURLをコピーしました', 'success'); }} className="p-2 bg-white rounded-md text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors shadow-sm" title="URLをコピー">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {allowPublicEdit && (
                    <div className="text-left mb-6">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">共同編集用URL (作者仲間を招待)</label>
                      <div className="bg-white/50 border border-slate-200 rounded-lg p-2 flex items-center gap-2">
                        <input type="text" readOnly value={`${window.location.origin}${window.location.pathname}#/editor/${savedBoardId}`} className="flex-1 bg-transparent text-sm text-slate-600 outline-none px-2" />
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/editor/${savedBoardId}`); addToast('編集用URLをコピーしました', 'success'); }} className="p-2 bg-white rounded-md text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors shadow-sm" title="URLをコピー">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {!allowPublicEdit && <div className="h-4" />}
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

        <AnimatePresence>
          {showRevisions && currentBoardId && (
            <RevisionHistoryPanel 
              boardId={currentBoardId} 
              onClose={() => setShowRevisions(false)} 
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTutorial && (
            <EditorTutorial 
              onComplete={() => {
                setShowTutorial(false);
                localStorage.setItem('has_seen_editor_tutorial', 'true');
              }} 
            />
          )}
        </AnimatePresence>
      </div>
    </ReactFlowProvider>
  );
}
