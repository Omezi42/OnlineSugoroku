import { motion } from 'framer-motion';
import { RotateCcw, SkipForward, UserMinus } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { Player } from '../../../types/game';

interface HostControlsProps {
  players: Record<string, Player>;
  playerOrder: string[];
  currentTurnIndex: number;
  localPlayerId: string;
  onResetGame: () => void;
  onSkipTurn: () => void;
  onRemovePlayer: (playerId: string) => void;
}

export const HostControls = ({
  players,
  playerOrder,
  currentTurnIndex,
  localPlayerId,
  onResetGame,
  onSkipTurn,
  onRemovePlayer,
}: HostControlsProps) => {
  const isHost = players[localPlayerId]?.isHost;
  if (!isHost) return null;

  return (
    <GlassCard className="pointer-events-auto p-4 w-72">
      <h3 className="font-bold text-slate-800 mb-3 text-sm">ホスト管理</h3>
      <div className="grid grid-cols-2 gap-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onSkipTurn}
          className="rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <SkipForward className="w-4 h-4" />
          ターン送り
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onResetGame}
          className="rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          リセット
        </motion.button>
      </div>
      <div className="mt-3 space-y-1.5">
        {playerOrder.map((pid, index) => {
          const player = players[pid];
          if (!player || pid === localPlayerId) return null;
          return (
            <button
              key={pid}
              onClick={() => onRemovePlayer(pid)}
              className="w-full rounded-xl bg-white/60 px-3 py-2 text-xs text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span className="flex-1 text-left truncate">{player.icon} {player.name}</span>
              {index === currentTurnIndex && <span className="font-bold">TURN</span>}
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
};
