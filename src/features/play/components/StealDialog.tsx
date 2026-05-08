import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { GlassCard } from '../../../components/ui/GlassCard';
import { PlayerIcon } from '../../../components/ui/PlayerIcon';
import type { Player } from '../../../types/game';
import type { StealAction } from '../../../types/board';

interface StealDialogProps {
  targets: string[];
  players: Record<string, Player>;
  action: StealAction;
  onSelect: (targetPlayerId: string) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
};

export const StealDialog = ({ targets, players, action, onSelect }: StealDialogProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <GlassCard className="w-[400px] max-w-[95vw] p-8">
          <h3 className="text-xl font-bold text-center mb-2">💰 誰から奪う？</h3>
          <p className="text-xs text-slate-500 text-center mb-6">
            ターゲットを1人選んでください（{action.amount} を奪います）
          </p>
          <div className="space-y-3">
            {targets.map((pid) => {
              const p = players[pid];
              if (!p) return null;
              return (
                <motion.button
                  key={pid}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(pid)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/70 hover:bg-white transition-colors shadow-sm hover:shadow-md"
                >
                  <PlayerIcon icon={p.icon} size="xl" />
                  <div className="flex-1 text-left">
                    <p className="font-bold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      所持: {p.params[action.paramId] ?? 0}
                    </p>
                  </div>
                  <span className="text-red-500 font-bold text-sm">-{Math.min(action.amount, p.params[action.paramId] || 0)}</span>
                </motion.button>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
