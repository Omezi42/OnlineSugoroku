import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../../components/ui/GlassCard';
import { PlayerIcon } from '../../../components/ui/PlayerIcon';
import type { Player } from '../../../types/game';
import type { ParameterDef } from '../../../types/board';

interface PlayerStatusPanelProps {
  players: Record<string, Player>;
  playerOrder: string[];
  currentTurnIndex: number;
  localPlayerId: string;
  parameters: ParameterDef[];
}

export const PlayerStatusPanel = ({
  players,
  playerOrder,
  currentTurnIndex,
  localPlayerId,
  parameters,
}: PlayerStatusPanelProps) => {
  return (
    <GlassCard className="pointer-events-auto p-3 sm:p-4 w-[48vw] min-w-40 sm:w-72 max-h-[42vh] sm:max-h-[70vh] overflow-y-auto">
      <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
        <span>👥</span> プレイヤー
      </h2>
      <div className="space-y-3">
        <AnimatePresence>
          {playerOrder.map((pid, idx) => {
            const p = players[pid];
            if (!p) return null;
            const isCurrentTurn = idx === currentTurnIndex;
            const isMe = pid === localPlayerId;

            return (
              <motion.div
                key={pid}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-xl p-3 transition-all ${
                  isCurrentTurn
                    ? 'bg-purple-100 ring-2 ring-purple-400 shadow-md'
                    : 'bg-white/50'
                }`}
              >
                {/* ヘッダー行 */}
                <div className="flex items-center gap-2 mb-2">
                  <PlayerIcon icon={p.icon} size="md" />
                  <span className="font-medium text-sm flex-1 truncate">{p.name}</span>
                  {isMe && (
                    <span className="text-[10px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">
                      YOU
                    </span>
                  )}
                  {isCurrentTurn && (
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold"
                    >
                      TURN
                    </motion.span>
                  )}
                </div>

                {/* ステータスバッジ */}
                <div className="flex flex-wrap gap-1.5">
                  {p.hasGoal && (
                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">
                      🏁 {p.rank}位ゴール
                    </span>
                  )}
                  {p.restTurns > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                      😴 {p.restTurns}回休み
                    </span>
                  )}
                </div>

                {/* パラメータ */}
                {parameters.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {parameters.map((param) => (
                      <div key={param.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{param.name}</span>
                        <span className="font-bold text-slate-700">
                          {p.params[param.id] ?? param.initialValue}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
};
