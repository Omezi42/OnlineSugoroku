import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { Player } from '../../../types/game';

interface ResultScreenProps {
  rankings: { playerId: string; rank: number; value: number }[];
  players: Record<string, Player>;
  winConditionLabel: string;
  onClose: () => void;
}

// 紙吹雪パーティクル
const Confetti = () => {
  const colors = ['#FF6B9D', '#C084FC', '#60A5FA', '#34D399', '#FBBF24', '#F87171'];
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 3,
    size: 4 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: 0, rotate: p.rotation + 720 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size * 1.5,
            backgroundColor: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
};

const medals = ['🥇', '🥈', '🥉'];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.5 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.8 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 15 } },
};

export const ResultScreen = ({ rankings, players, winConditionLabel, onClose }: ResultScreenProps) => {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900/90 via-pink-900/70 to-blue-900/90 backdrop-blur-md">
      {showConfetti && <Confetti />}

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative z-50"
      >
        <GlassCard className="w-[520px] max-w-[95vw] p-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-extrabold text-slate-800 mb-2">🏆 ゲーム終了！</h1>
            <p className="text-sm text-slate-500">{winConditionLabel}</p>
          </motion.div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3 mb-8">
            {rankings.map((r) => {
              const player = players[r.playerId];
              if (!player) return null;
              const isTop3 = r.rank <= 3;

              return (
                <motion.div
                  key={r.playerId}
                  variants={itemVariants}
                  className={`flex items-center gap-4 p-4 rounded-2xl ${
                    r.rank === 1
                      ? 'bg-gradient-to-r from-yellow-50 to-amber-50 ring-2 ring-yellow-300 shadow-lg'
                      : r.rank === 2
                      ? 'bg-gradient-to-r from-slate-50 to-gray-100 ring-1 ring-slate-300'
                      : r.rank === 3
                      ? 'bg-gradient-to-r from-orange-50 to-amber-50 ring-1 ring-orange-200'
                      : 'bg-white/50'
                  }`}
                >
                  <span className="text-3xl w-10 text-center">
                    {isTop3 ? medals[r.rank - 1] : `${r.rank}`}
                  </span>
                  <span className="text-2xl">{player.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{player.name}</p>
                    <p className="text-xs text-slate-500">スコア: {r.value}</p>
                  </div>
                  {r.rank === 1 && (
                    <motion.span
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-2xl"
                    >
                      👑
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            ホームに戻る
          </motion.button>
        </GlassCard>
      </motion.div>
    </div>
  );
};
