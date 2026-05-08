import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, PenTool, Sparkles, Users, X, ArrowRight, GalleryHorizontalEnd, Loader2, Pencil, BookOpen, Info, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { listBoards, listMyBoards } from '../../services/boardService';
import type { BoardData, BoardSort } from '../../services/boardService';
import { RulebookModal } from '../../components/RulebookModal';
import { AuthPanel } from '../auth/AuthPanel';
import { useAuthUser } from '../../hooks/useAuthUser';
import { getLocalOwnerId } from '../../services/localIdentity';

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
  }, [localOwnerId, user?.uid]);

  const handleJoin = (event?: React.FormEvent) => {
    event?.preventDefault();
    const value = roomIdInput.trim();
    if (!value) return;
    try {
      const url = new URL(value);
      const path = url.pathname.replace(import.meta.env.BASE_URL, '/');
      navigate(path.startsWith('/play/') ? path : `/play/${value}`);
    } catch {
      navigate(`/play/${value}`);
    }
  };

  const renderBoardCard = (board: BoardData, index: number) => (
    <GlassCard key={board.id || `${board.name}-${index}`} hoverEffect className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-800 truncate">{board.name || '無題のすごろく'}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {board.nodes.filter((node) => node.data.nodeType !== 'area').length}マス / {board.edges.length}ルート
          </p>
          <p className="text-xs text-slate-500 mt-1 truncate">{board.description || '説明はまだありません'}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
            <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">{categories.find((item) => item.value === board.category)?.label || '未分類'}</span>
            <span className="rounded-full bg-pink-50 px-2 py-1 text-pink-700">プレイ {board.playCount || 0}</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 text-white flex items-center justify-center shadow-md">
          <Play className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={() => setSelectedBoard(board)} className="py-2 rounded-xl bg-white/70 text-sm font-bold text-blue-700 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
          <Info className="w-4 h-4" />
          詳細
        </button>
        <button onClick={() => board.id && navigate(`/editor/${board.id}`)} className="py-2 rounded-xl bg-white/70 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5">
          <Pencil className="w-4 h-4" />
          編集
        </button>
        <button onClick={() => board.id && navigate(`/play/${board.id}/room-${Date.now().toString(36)}`)} className="py-2 rounded-xl bg-white/70 text-sm font-bold text-purple-700 hover:bg-purple-50 transition-colors flex items-center justify-center gap-1.5">
          <Play className="w-4 h-4" />
          遊ぶ
        </button>
      </div>
    </GlassCard>
  );

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
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <Button size="lg" icon={<PenTool className="w-5 h-5" />} onClick={() => navigate('/editor')} className="w-full sm:w-auto">
                盤面を作る
              </Button>
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
            ) : myBoards.map(renderBoardCard)}
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
            {!isGalleryLoading && boards.map(renderBoardCard)}
          </div>
        </motion.section>
      </motion.div>

      <AnimatePresence>
        {showRulebook && <RulebookModal onClose={() => setShowRulebook(false)} />}
        {selectedBoard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="w-full max-w-lg">
              <GlassCard className="p-6 relative shadow-2xl">
                <button onClick={() => setSelectedBoard(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold text-slate-800 pr-8">{selectedBoard.name || '無題のすごろく'}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{selectedBoard.description || 'この盤面にはまだ説明がありません。'}</p>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white/60 p-3"><p className="text-xs text-slate-500">マス</p><p className="font-black text-slate-800">{selectedBoard.nodes.filter((node) => node.data.nodeType !== 'area').length}</p></div>
                  <div className="rounded-xl bg-white/60 p-3"><p className="text-xs text-slate-500">ルート</p><p className="font-black text-slate-800">{selectedBoard.edges.length}</p></div>
                  <div className="rounded-xl bg-white/60 p-3"><p className="text-xs text-slate-500">作者</p><p className="font-black text-slate-800 truncate">{selectedBoard.authorName || '未設定'}</p></div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
        {showJoinModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="w-full max-w-md">
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
