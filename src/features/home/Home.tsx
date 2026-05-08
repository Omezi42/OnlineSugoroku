import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, PenTool, Sparkles, Users, X, ArrowRight, GalleryHorizontalEnd, Loader2, Pencil } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { listBoards } from '../../services/boardService';
import type { BoardData } from '../../services/boardService';

export default function Home() {
  const navigate = useNavigate();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listBoards(6)
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
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 },
    },
  };

  const handleJoin = (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = roomIdInput.trim();
    if (value) {
      try {
        const url = new URL(value);
        const path = url.pathname.replace(import.meta.env.BASE_URL, '/');
        navigate(path.startsWith('/play/') ? path : `/play/${value}`);
      } catch {
        navigate(`/play/${value}`);
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4 bg-slate-50">
      {/* 装飾用の背景要素 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
      
      <motion.div
        className="z-10 max-w-4xl w-full text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-medium text-purple-700 mb-4 shadow-sm border border-white/50">
            <Sparkles className="w-4 h-4" />
            <span>最新アップデート: v1.0 登場</span>
          </div>
        </motion.div>

        <motion.h1 
          variants={itemVariants}
          className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 drop-shadow-sm"
        >
          オリジナルの<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">ボードゲーム</span>を<br />
          作って、みんなと遊ぼう。
        </motion.h1>

        <motion.p 
          variants={itemVariants}
          className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          直感的なエディターで世界に一つの「すごろく」を作成。<br />
          URLを共有するだけで、いつでもどこでもオンラインで同期プレイが可能です。
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
          <Button 
            size="lg" 
            icon={<PenTool className="w-5 h-5" />}
            onClick={() => navigate('/editor')}
            className="w-full sm:w-auto"
          >
            盤面をつくる
          </Button>
          <Button 
            variant="glass" 
            size="lg" 
            icon={<Play className="w-5 h-5" />}
            onClick={() => setShowJoinModal(true)}
            className="w-full sm:w-auto"
          >
            ルームに参加する
          </Button>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-16 text-left">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <GalleryHorizontalEnd className="w-6 h-6 text-pink-500" />
                みんなの盤面
              </h2>
              <p className="text-sm text-slate-500 mt-1">保存された盤面からすぐに遊べます。</p>
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
              <GlassCard className="md:col-span-3 p-5 text-center text-sm text-slate-500">
                まだ公開できる盤面がありません。最初の盤面を作って保存してみましょう。
              </GlassCard>
            )}
            {!isGalleryLoading && boards.map((board, index) => (
              <GlassCard key={board.id || `${board.name}-${index}`} hoverEffect className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{board.name || '名称未設定のすごろく'}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {board.nodes.filter((node) => node.data.nodeType !== 'area').length}マス / {board.edges.length}ルート
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 text-white flex items-center justify-center shadow-md">
                    <Play className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => board.id && navigate(`/editor/${board.id}`)}
                    className="py-2 rounded-xl bg-white/70 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="w-4 h-4" />
                    編集
                  </button>
                  <button
                    onClick={() => board.id && navigate(`/play/${board.id}/room-${Date.now().toString(36)}`)}
                    className="py-2 rounded-xl bg-white/70 text-sm font-bold text-purple-700 hover:bg-purple-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-4 h-4" />
                    遊ぶ
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <GlassCard hoverEffect>
            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center mb-4 text-pink-600 shadow-inner">
              <PenTool className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">圧倒的自由度のエディター</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              ノードを繋ぐだけで直感的に盤面を作成。分岐やワープ、画像のカスタムなど多彩な表現が可能です。
            </p>
          </GlassCard>

          <GlassCard hoverEffect>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-4 text-purple-600 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">12種のアクション</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              パラメータ増減からミニゲームまで、マスに止まった際のアクションを複数組み合わせることができます。
            </p>
          </GlassCard>

          <GlassCard hoverEffect>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 text-blue-600 shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">完全同期のマルチプレイ</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              サイコロの物理演算から他プレイヤーへの干渉まで、すべてのアクションがリアルタイムに同期されます。
            </p>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* ルーム参加モーダル */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md"
            >
              <GlassCard className="p-6 relative shadow-2xl">
                <button 
                  onClick={() => setShowJoinModal(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Play className="w-6 h-6 text-purple-500" />
                  ルームに参加
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  友達から共有されたルームID（またはURLの末尾）を入力してください。
                </p>

                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="例: room-12345"
                      value={roomIdInput}
                      onChange={(e) => setRoomIdInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono text-slate-700"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!roomIdInput.trim()}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
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
