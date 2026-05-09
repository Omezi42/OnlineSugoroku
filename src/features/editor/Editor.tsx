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
import { History, Share2, Check, Copy, Globe2, Loader2, Play, X, Home, Menu, Settings } from 'lucide-react';
import { RevisionHistoryPanel } from './panels/RevisionHistoryPanel';
import { BoardSettingsPanel } from './panels/BoardSettingsPanel';
import { EditorTutorial } from './components/EditorTutorial';
import { validateBoard } from './utils/boardValidation';
import { useAuthUser } from '../../hooks/useAuthUser';
import { getLocalOwnerId } from '../../services/localIdentity';
import { useToast } from '../../hooks/useToast';

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
  const [draftAvailable, setDraftAvailable] = useState(false);
  
  useEffect(() => {
    if (!routeBoardId) {
      setDraftAvailable(false);
      return;
    }
    setDraftAvailable(Boolean(localStorage.getItem(draftKey)));
  }, [draftKey, routeBoardId]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced'>('idle');
  const [showRevisions, setShowRevisions] = useState(false);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('has_seen_editor_tutorial'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { addToast } = useToast();

  const location = useLocation();
  const isUpdatingFromRemote = useRef(false);
  const lastLocalUpdate = useRef(0);
  
  // 常に最新の状態を参照するためのRef
  const stateRef = useRef({ boardName, boardDescription, authorName, isPublic, allowPublicEdit });
  useEffect(() => {
    stateRef.current = { boardName, boardDescription, authorName, isPublic, allowPublicEdit };
  }, [boardName, boardDescription, authorName, isPublic, allowPublicEdit]);

  useEffect(() => {
    if (!routeBoardId) {
      // 新規作成の場合、ユニークなIDを生成してリダイレクト（共同編集を可能にするため）
      const newId = crypto.randomUUID();
      const params = new URLSearchParams(location.search);
      const template = params.get('template');
      const search = template ? `?template=${template}` : '';
      navigate(`/editor/${newId}${search}`, { replace: true });
      return;
    }
    let cancelled = false;
    loadBoard(routeBoardId)
      .then((board) => {
        if (cancelled) return;
        if (!board) {
          // 盤面が見つからない場合は新規盤面として扱う（リダイレクト直後など）
          const params = new URLSearchParams(location.search);
          const template = params.get('template');
          if (template) {
            useEditorStore.getState().applyTemplate(template as any);
            setBoardName('テンプレートから作成');
          } else {
            useEditorStore.getState().resetStore();
            setBoardName('無題のすごろく');
          }
          setIsLoadingBoard(false);
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
      if (Date.now() - lastLocalUpdate.current < 1000) return;

      isUpdatingFromRemote.current = true;
      useEditorStore.getState().mergeRemoteState({
        nodes: data.nodes,
        edges: data.edges,
        settings: data.settings,
      });
      
      const current = stateRef.current;
      if (data.name !== current.boardName) setBoardName(data.name);
      if (data.description !== current.boardDescription) setBoardDescription(data.description || '');
      if (data.authorName !== current.authorName) setAuthorName(data.authorName || '');
      if (data.isPublic !== current.isPublic) setIsPublic(Boolean(data.isPublic));
      if (data.allowPublicEdit !== current.allowPublicEdit) setAllowPublicEdit(Boolean(data.allowPublicEdit));
      
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

  const handleSave = async (createRevision = false) => {
    const validation = validateBoard(nodes, edges);
    if (!validation.ok) {
      addToast(`エラー: ${validation.errors[0]}`, 'danger');
      return;
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
      localStorage.removeItem(draftKey);
      setDraftAvailable(false);
      
      if (createRevision) {
        await saveRevision(boardId, {
          name: boardName,
          nodes,
          edges,
          settings: boardSettings,
        }, ''); // No note by default as per request
        addToast('保存して履歴を作成しました', 'success');
      } else {
        addToast('盤面を保存しました', 'success');
      }
      
      return boardId;
    } catch (error) {
      console.error('Failed to save board:', error);
      addToast('保存に失敗しました。', 'danger');
      return null;
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



  const handlePlayClick = async () => {
    if (currentBoardId) {
      navigate(`/play/${currentBoardId}/room-${Date.now().toString(36)}`);
    } else {
      const id = await handleSave();
      if (id) navigate(`/play/${id}/room-${Date.now().toString(36)}`);
    }
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

        <EditorToolbar />

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
                <NodeConfigPanel onClose={() => useEditorStore.setState({ nodes: nodes.map(n => ({...n, selected: false})) })} />
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
                
                <div className="flex items-center gap-2 mt-1 min-h-[24px]">
                  <AnimatePresence mode="wait">
                    {allowPublicEdit && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        <Globe2 className="w-3 h-3" />
                        共同編集ON
                      </motion.div>
                    )}
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
              {/* 設定ボタン */}
              <button
                onClick={() => setShowBoardSettings(true)}
                className="glass-panel p-3 rounded-xl shadow-sm text-slate-600 hover:text-purple-600 transition-colors flex items-center justify-center h-[52px]"
                title="ボード設定"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* 共有ボタン */}
              <button
                onClick={() => setShowShareModal(true)}
                className={`glass-panel p-3 rounded-xl shadow-sm transition-colors flex items-center justify-center h-[52px] ${
                  allowPublicEdit ? 'text-green-600 hover:bg-green-50' : 'text-slate-600 hover:text-purple-600'
                }`}
                title="共有・共同編集設定"
              >
                <Share2 className="w-5 h-5" />
              </button>

              {/* 保存ボタン */}
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="glass-panel px-4 md:px-6 py-2 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all transform active:scale-95 disabled:opacity-70 text-xs md:text-sm h-[52px] border border-slate-200"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                ) : (
                  <span className="text-slate-700">
                    {currentBoardId ? '上書き保存' : '保存'}
                  </span>
                )}
              </button>

              {/* プレイボタン */}
              <button
                id="test-play-button"
                onClick={handlePlayClick}
                className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 md:px-8 py-2 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 text-xs md:text-sm h-[52px]"
              >
                <Play className="w-5 h-5 fill-current" />
                プレイ
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showShareModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={() => setShowShareModal(false)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
                <GlassCard className="p-8 relative">
                  <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                  
                  <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Share2 className="w-6 h-6 text-purple-500" />
                    共有・共同編集
                  </h2>

                  <div className="space-y-6 text-left">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <span className="block text-sm font-bold text-slate-700">共同編集を許可</span>
                        <span className="text-[10px] text-slate-500">URLを知っている人がリアルタイムで編集できます</span>
                      </div>
                      <button
                        className={`relative w-12 h-6 rounded-full transition-colors ${allowPublicEdit ? 'bg-green-500' : 'bg-slate-300'}`}
                        onClick={() => setAllowPublicEdit(!allowPublicEdit)}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${allowPublicEdit ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <span className="block text-sm font-bold text-slate-700">盤面を公開する</span>
                        <span className="text-[10px] text-slate-500">ホーム画面の「みんなのすごろく」に表示されます</span>
                      </div>
                      <button
                        className={`relative w-12 h-6 rounded-full transition-colors ${isPublic ? 'bg-purple-500' : 'bg-slate-300'}`}
                        onClick={() => setIsPublic(!isPublic)}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isPublic ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">🎮 プレイ用URL (みんなを招待)</label>
                        <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center gap-2">
                          <input type="text" readOnly value={`${window.location.origin}${window.location.pathname}#/play/${currentBoardId || ''}/room-${Date.now().toString(36)}`} className="flex-1 bg-transparent text-xs text-slate-600 outline-none px-2" />
                          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/play/${currentBoardId || ''}/room-${Date.now().toString(36)}`); addToast('プレイURLをコピーしました', 'success'); }} className="p-2 hover:bg-slate-50 rounded-lg text-purple-600 transition-colors">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {currentBoardId && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">🤝 編集用URL (作者仲間を招待)</label>
                          <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center gap-2">
                            <input type="text" readOnly value={`${window.location.origin}${window.location.pathname}#/editor/${currentBoardId}`} className="flex-1 bg-transparent text-xs text-slate-600 outline-none px-2" />
                            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/editor/${currentBoardId}`); addToast('編集用URLをコピーしました', 'success'); }} className="p-2 hover:bg-slate-50 rounded-lg text-purple-600 transition-colors">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowShareModal(false)}
                    className="w-full mt-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors"
                  >
                    閉じる
                  </button>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <BoardSettingsPanel isOpen={showBoardSettings} onClose={() => setShowBoardSettings(false)} />

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
                  <div className="text-left mb-4 mt-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">🎮 プレイ用URL (みんなを招待)</label>
                    <div className="bg-white/70 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2 shadow-inner">
                      <input type="text" readOnly value={`${window.location.origin}${window.location.pathname}#/play/${savedBoardId}/room-${Date.now().toString(36)}`} className="flex-1 bg-transparent text-sm text-slate-600 outline-none px-2" />
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/play/${savedBoardId}/room-${Date.now().toString(36)}`); addToast('プレイURLをコピーしました', 'success'); }} className="p-2.5 bg-white rounded-lg text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-all shadow-sm border border-slate-100" title="URLをコピー">
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {allowPublicEdit && (
                    <div className="text-left mb-8">
                      <div className="flex items-center gap-2 mb-1 ml-1">
                        <label className="text-[10px] font-bold text-green-600 uppercase tracking-wider">🤝 共同編集用URL (作者仲間を招待)</label>
                        <span className="text-[9px] bg-green-100 text-green-700 px-1.5 rounded-full font-bold">権限あり</span>
                      </div>
                      <div className="bg-green-50/50 border border-green-100 rounded-xl p-2.5 flex items-center gap-2 shadow-inner">
                        <input type="text" readOnly value={`${window.location.origin}${window.location.pathname}#/editor/${savedBoardId}`} className="flex-1 bg-transparent text-sm text-green-700 outline-none px-2" />
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/editor/${savedBoardId}`); addToast('編集用URLをコピーしました', 'success'); }} className="p-2.5 bg-white rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50 transition-all shadow-sm border border-green-100" title="URLをコピー">
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400 text-center leading-relaxed">
                        このURLを受け取った人は、あなたと一緒にリアルタイムで盤面を編集できます。
                      </p>
                    </div>
                  )}
                  {!allowPublicEdit && (
                    <div className="bg-slate-50 p-4 rounded-xl mb-8 border border-slate-100">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        共同編集はOFFです。URLを知っている人は閲覧のみ可能です。<br/>
                        設定から「共同編集を許可」をONにすると友達と一緒に作成できます。
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    <button onClick={handlePlayClick} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all">
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
          {draftAvailable && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 50 }} 
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-lg"
            >
              <GlassCard className="p-4 flex items-center justify-between gap-4 shadow-2xl border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-slate-800">未保存の下書きがあります</h3>
                    <p className="text-[10px] text-slate-500">前回の続きから編集を再開しますか？</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleDiscardDraft} 
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    破棄
                  </button>
                  <button 
                    onClick={handleRestoreDraft} 
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-purple-200 transition-all active:scale-95"
                  >
                    復元する
                  </button>
                </div>
              </GlassCard>
            </motion.div>
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
