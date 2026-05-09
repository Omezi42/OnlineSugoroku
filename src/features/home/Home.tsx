import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, PenTool, Sparkles, Users, X, ArrowRight, GalleryHorizontalEnd, Loader2, Pencil, BookOpen, Info, Search, SlidersHorizontal, Trash2, User, Calendar, TrendingUp, Share2, Copy, Flag, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { listBoards, listMyBoards, deleteBoard, cloneBoard, reportBoard } from '../../services/boardService';
import type { BoardData, BoardSort } from '../../services/boardService';
import { RulebookModal } from '../../components/RulebookModal';
import { AuthPanel } from '../auth/AuthPanel';
import { useAuthUser } from '../../hooks/useAuthUser';
import { getLocalOwnerId } from '../../services/localIdentity';
import { useToast } from '../../hooks/useToast';

const categories = [
  { value: 'all', label: 'すべて' },
  { value: 'party', label: 'パーティー' },
  { value: 'learning', label: '学習' },
  { value: 'story', label: 'ストーリー' },
  { value: 'challenge', label: 'チャレンジ' },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const localOwnerId = useMemo(() => getLocalOwnerId(), []);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [myBoards, setMyBoards] = useState<BoardData[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<BoardData | null>(null);
  const [showRulebook, setShowRulebook] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<BoardSort>('recent');
  const { addToast } = useToast();

  useEffect(() => {
    let mounted = true;
    setIsGalleryLoading(true);
    listBoards({ maxCount: 12, search: searchText, category, sort })
      .then((items) => {
        if (mounted) setBoards(items);
      })
      .catch(() => {
        if (mounted) setBoards([]);
      })
      .finally(() => {
        if (mounted) setIsGalleryLoading(false);
      });
    return () => { mounted = false; };
  }, [category, searchText, sort]);

  useEffect(() => {
    let mounted = true;
    const ownerId = user?.uid || localOwnerId;
    listMyBoards(ownerId, 8)
      .then((items) => {
        if (mounted) setMyBoards(items);
      })
      .catch(() => {
        if (mounted) setMyBoards([]);
      });
    return () => { mounted = false; };
  }, [localOwnerId, user?.uid, user]);

  const handleJoin = (event?: React.FormEvent) => {
    event?.preventDefault();
    const value = roomIdInput.trim();
    if (!value) return;
    try {
      const url = new URL(value);
      const path = url.hash ? url.hash.slice(1) : url.pathname.replace(import.meta.env.BASE_URL, '/');
      navigate(path.startsWith('/play/') ? path : `/play/${value}`);
    } catch {
      navigate(`/play/${value}`);
    }
  };

  const handleDeleteBoard = async (board: BoardData) => {
    if (!board.id) return;
    if (!window.confirm(`「${board.name || '無題のすごろく'}」を削除しますか？\nこの操作は取り消せません。`)) return;
    try {
      await deleteBoard(board.id);
      setMyBoards(prev => prev.filter(b => b.id !== board.id));
      setBoards(prev => prev.filter(b => b.id !== board.id));
      addToast(`「${board.name || '無題のすごろく'}」を削除しました`, 'success');
    } catch {
      addToast('削除に失敗しました', 'danger');
    }
  };

  const handleClone = async (board: BoardData) => {
    try {
      const ownerId = user?.uid || localOwnerId;
      const ownerName = user?.displayName || user?.email || '名無しさん';
      const newId = await cloneBoard(board, ownerId, ownerName);
      addToast('盤面を複製しました。エディターに移動します。', 'success');
      navigate(`/editor/${newId}`);
    } catch {
      addToast('複製に失敗しました。', 'danger');
    }
  };

  const handleReport = async (boardId: string) => {
    if (!window.confirm('この盤面を不適切なコンテンツとして通報しますか？')) return;
    try {
      await reportBoard(boardId);
      addToast('通報を受け付けました。ご協力ありがとうございます。', 'success');
    } catch {
      addToast('エラーが発生しました。', 'danger');
    }
  };

  const renderBoardCard = (board: BoardData, index: number, showDelete = false) => {
    return (
      <GlassCard key={board.id || `${board.name}-${index}`} hoverEffect className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 truncate" title={board.name}>{board.name || '無題のすごろく'}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {board.nodes.filter((node) => node.data.nodeType !== 'area').length}マス / {board.edges.length}ルート
            </p>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[2rem]" title={board.description}>{board.description || '説明はまだありません'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">{categories.find((item) => item.value === board.category)?.label || '未分類'}</span>
              {board.allowPublicEdit && (
                <span className="rounded-full bg-pink-100 px-2 py-1 text-pink-700 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  共同編集
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 text-white flex shrink-0 items-center justify-center shadow-md cursor-pointer" onClick={() => setSelectedBoard(board)}>
              <Play className="w-5 h-5 ml-0.5" />
            </div>
            {showDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="盤面を削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
          <button onClick={() => setSelectedBoard(board)} className="py-2 px-1 rounded-xl bg-white/70 text-xs sm:text-sm font-bold text-blue-700 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm border border-white">
            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>詳細</span>
          </button>
          {(board.allowPublicEdit || showDelete) ? (
            <button onClick={() => board.id && navigate(`/editor/${board.id}`)} className="py-2 px-1 rounded-xl bg-pink-50 text-xs sm:text-sm font-bold text-pink-700 hover:bg-pink-100 transition-colors flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm border border-pink-200">
              <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{showDelete ? '編集' : '共同編集'}</span>
            </button>
          ) : (
            <button onClick={() => handleClone(board)} className="py-2 px-1 rounded-xl bg-purple-50 text-xs sm:text-sm font-bold text-purple-700 hover:bg-purple-100 transition-colors flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm border border-purple-200">
              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>複製</span>
            </button>
          )}
          <button onClick={() => board.id && navigate(`/play/${board.id}/room-${Date.now().toString(36)}`)} className="py-2 px-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs sm:text-sm font-bold hover:shadow-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5 shadow-md">
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 fill-current" />
            <span>遊ぶ</span>
          </button>
        </div>
      </GlassCard>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 p-4">
      <div className="absolute top-[-12%] left-[-8%] w-[36rem] h-[36rem] bg-pink-300/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-12%] right-[-8%] w-[42rem] h-[42rem] bg-cyan-300/25 rounded-full blur-3xl pointer-events-none" />
      <motion.div className="relative z-10 mx-auto max-w-6xl py-10" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-medium text-purple-700 mb-5 shadow-sm border border-white/50">
              <Sparkles className="w-4 h-4" />
              <span>作って、共有して、みんなで遊べるオンラインすごろく</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-5">
              オリジナルの<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">すごろく</span>を作ろう
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              React Flowのエディタで自由に盤面を作り、URLひとつで友達とリアルタイムに遊べます。
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start items-center">
              <Button size="lg" icon={<PenTool className="w-5 h-5" />} onClick={() => navigate('/editor')} className="w-full sm:w-auto">
                空から作る
              </Button>
              <div className="relative group w-full sm:w-auto">
                <Button variant="glass" size="lg" icon={<Sparkles className="w-5 h-5" />} className="w-full sm:w-auto text-pink-600 border-pink-200 hover:bg-pink-50 group-hover:bg-pink-50">
                  テンプレから作る ▼
                </Button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 p-2 flex flex-col gap-1">
                  <button onClick={() => navigate('/editor?template=party')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-pink-50 transition-colors">
                    <span className="font-bold text-slate-800">🎉 パーティー</span>
                    <span className="block text-xs text-slate-500 mt-0.5">ミニゲームやワープ満載の楽しいルート</span>
                  </button>
                  <button onClick={() => navigate('/editor?template=branch')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                    <span className="font-bold text-slate-800">🔀 分岐ルート</span>
                    <span className="block text-xs text-slate-500 mt-0.5">条件分岐やランダム分岐のある複雑なルート</span>
                  </button>
                  <button onClick={() => navigate('/editor?template=long')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-purple-50 transition-colors">
                    <span className="font-bold text-slate-800">🏔️ ロング</span>
                    <span className="block text-xs text-slate-500 mt-0.5">15マスの蛇行ルートでじっくりプレイ</span>
                  </button>
                </div>
              </div>
              <Button variant="glass" size="lg" icon={<Play className="w-5 h-5" />} onClick={() => setShowJoinModal(true)} className="w-full sm:w-auto">
                ルームに参加
              </Button>
              <Button variant="glass" size="lg" icon={<BookOpen className="w-5 h-5" />} onClick={() => setShowRulebook(true)} className="w-full sm:w-auto">
                チュートリアル
              </Button>
            </div>
          </div>
          <GlassCard className="p-4">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
              <Users className="w-5 h-5 text-purple-500" />
              アカウント
            </h2>
            <AuthPanel />
          </GlassCard>
        </motion.div>

        <motion.section variants={itemVariants} className="mt-12">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-6 h-6 text-purple-500" />
                自分の盤面一覧
              </h2>
              <p className="text-sm text-slate-500 mt-1">ログイン中はアカウント所有、未ログイン時はこの端末のローカル所有として保存されます。</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {myBoards.length === 0 ? (
              <GlassCard className="md:col-span-4 p-5 text-center text-sm text-slate-500">まだ自分の盤面がありません。最初の盤面を作ってみましょう。</GlassCard>
            ) : myBoards.map((board, index) => renderBoardCard(board, index, true))}
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="mt-12">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <GalleryHorizontalEnd className="w-6 h-6 text-pink-500" />
                公開ギャラリー
              </h2>
              <p className="text-sm text-slate-500 mt-1">公開された盤面を検索して、すぐに遊べます。</p>
            </div>
            <div className="glass-panel rounded-2xl p-2 flex flex-col gap-2 sm:flex-row">
              <label className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="検索" className="w-40 bg-transparent text-sm outline-none" />
              </label>
              <label className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="bg-transparent text-sm outline-none">
                  {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <select value={sort} onChange={(event) => setSort(event.target.value as BoardSort)} className="rounded-xl bg-white/70 px-3 py-2 text-sm outline-none">
                <option value="recent">新着順</option>
                <option value="popular">人気順</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isGalleryLoading && (
              <GlassCard className="md:col-span-3 p-5 flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                盤面を読み込み中...
              </GlassCard>
            )}
            {!isGalleryLoading && boards.length === 0 && (
              <GlassCard className="md:col-span-3 p-5 text-center text-sm text-slate-500">条件に合う公開盤面がありません。</GlassCard>
            )}
            {!isGalleryLoading && boards.map((board, index) => renderBoardCard(board, index))}
          </div>
        </motion.section>
      </motion.div>

      <AnimatePresence>
        {showRulebook && <RulebookModal onClose={() => setShowRulebook(false)} />}
        
        {selectedBoard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setSelectedBoard(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
              <GlassCard className="p-8 sm:p-10 relative overflow-hidden shadow-2xl">
                {/* 装飾 */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-200/30 rounded-full blur-3xl" />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-600 uppercase tracking-wider">
                          {selectedBoard.category || 'PARTY'}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">
                        {selectedBoard.name}
                      </h2>
                    </div>
                    <button onClick={() => setSelectedBoard(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <p className="text-slate-600 leading-relaxed mb-8 text-sm sm:text-base">
                    {selectedBoard.description || 'この盤面にはまだ説明がありません。'}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <User className="w-3.5 h-3.5" /> 作者
                      </div>
                      <div className="text-sm font-bold text-slate-700">{selectedBoard.authorName || '名無しさん'}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <Calendar className="w-3.5 h-3.5" /> 更新日
                      </div>
                      <div className="text-sm font-bold text-slate-700">
                        {selectedBoard.updatedAt ? new Date((selectedBoard.updatedAt as any).seconds * 1000).toLocaleDateString() : '---'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <TrendingUp className="w-3.5 h-3.5" /> プレイ回数
                      </div>
                      <div className="text-sm font-bold text-slate-700">{selectedBoard.playCount || 0} 回</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <BookOpen className="w-3.5 h-3.5" /> マス数
                      </div>
                      <div className="text-sm font-bold text-slate-700">{selectedBoard.nodes.length || 0} マス</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => navigate(`/play/${selectedBoard.id}/room-${Date.now().toString(36)}`)}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      あそぶ
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleClone(selectedBoard)}
                        title="自分のワークスペースに複製"
                        className="flex-1 sm:flex-none aspect-square sm:w-14 bg-white border-2 border-slate-100 text-slate-500 hover:text-purple-600 hover:border-purple-100 hover:bg-purple-50 transition-all rounded-2xl flex items-center justify-center group"
                      >
                        <Copy className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}${window.location.pathname}#/play/${selectedBoard.id}/room-${Date.now().toString(36)}`;
                          navigator.clipboard.writeText(url);
                          addToast('共有URLをコピーしました', 'success');
                        }}
                        title="共有URLをコピー"
                        className="flex-1 sm:flex-none aspect-square sm:w-14 bg-white border-2 border-slate-100 text-slate-500 hover:text-purple-600 hover:border-purple-100 hover:bg-purple-50 transition-all rounded-2xl flex items-center justify-center group"
                      >
                        <Share2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      </button>
                      <button
                        onClick={() => handleReport(selectedBoard.id!)}
                        title="不適切な内容として通報"
                        className="flex-1 sm:flex-none aspect-square sm:w-14 bg-white border-2 border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all rounded-2xl flex items-center justify-center group"
                      >
                        <Flag className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                  
                  {selectedBoard.reportCount && selectedBoard.reportCount > 0 && (
                    <div className="mt-6 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      この盤面は他のユーザーから通報されています。プレイの際はご注意ください。
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}

        {showJoinModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setShowJoinModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="w-full max-w-md" onClick={e => e.stopPropagation()}>
              <GlassCard className="p-6 relative shadow-2xl">
                <button onClick={() => setShowJoinModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Play className="w-6 h-6 text-purple-500" />
                  ルームに参加
                </h2>
                <p className="text-slate-500 text-sm mb-6">共有されたルームID、またはプレイURLを入力してください。</p>
                <form onSubmit={handleJoin} className="space-y-4">
                  <input type="text" placeholder="例: room-12345" value={roomIdInput} onChange={(event) => setRoomIdInput(event.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono text-slate-700" autoFocus />
                  <button type="submit" disabled={!roomIdInput.trim()} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                    参加する
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
