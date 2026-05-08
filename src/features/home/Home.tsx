import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, PenTool, Sparkles, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';

export default function Home() {
  const navigate = useNavigate();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
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

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-medium text-purple-700 mb-4">
            <Sparkles className="w-4 h-4" />
            <span>最新アップデート: v1.0 登場</span>
          </div>
        </motion.div>

        <motion.h1 
          variants={itemVariants}
          className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6"
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

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-24">
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
            onClick={() => {
              // TODO: ルームID入力モーダルなどを出す
              const roomId = prompt('参加するルームIDを入力してください (空ならテストルーム)');
              navigate(`/play/${roomId || 'test-room'}`);
            }}
            className="w-full sm:w-auto"
          >
            ルームに参加する
          </Button>
        </motion.div>

        {/* Feature Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <GlassCard hoverEffect>
            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center mb-4 text-pink-600">
              <PenTool className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">圧倒的自由度のエディター</h3>
            <p className="text-slate-600">
              ノードを繋ぐだけで直感的に盤面を作成。分岐やワープ、画像のカスタムなど多彩な表現が可能です。
            </p>
          </GlassCard>

          <GlassCard hoverEffect>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-4 text-purple-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">12種のアクション</h3>
            <p className="text-slate-600">
              パラメータ増減からミニゲームまで、マスに止まった際のアクションを複数組み合わせることができます。
            </p>
          </GlassCard>

          <GlassCard hoverEffect>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">完全同期のマルチプレイ</h3>
            <p className="text-slate-600">
              サイコロの物理演算から他プレイヤーへの干渉まで、すべてのアクションがリアルタイムに同期されます。
            </p>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
