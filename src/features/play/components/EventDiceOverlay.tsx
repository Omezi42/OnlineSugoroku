import { motion } from 'framer-motion';
import { Dice } from './Dice';
import type { DiceType } from '../../../types/board';
import { Sparkles, Loader2 } from 'lucide-react';

interface EventDiceOverlayProps {
  diceType: DiceType;
  title?: string;
  onRollComplete: (result: number) => void;
  isOwner: boolean;
  playerName: string;
}

export const EventDiceOverlay = ({ diceType, title = 'イベントサイコロ！', onRollComplete, isOwner, playerName }: EventDiceOverlayProps) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm p-8 flex flex-col items-center bg-white/10 rounded-3xl border border-white/20 shadow-2xl"
      >
        <h2 className="text-2xl font-black text-white mb-10 tracking-wider drop-shadow-lg flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-yellow-400 fill-current" />
          {title}
        </h2>

        <div className="bg-white/10 p-12 rounded-full backdrop-blur-sm border border-white/10 shadow-inner mb-4">
          <Dice
            diceType={diceType}
            onRollComplete={onRollComplete}
            disabled={!isOwner}
          />
        </div>

        {isOwner ? (
          <p className="mt-4 text-white/60 text-sm font-medium animate-pulse">サイコロをタップして振ってください</p>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
            <p className="text-white/60 text-sm font-medium">{playerName} さんが振るのを待っています...</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
