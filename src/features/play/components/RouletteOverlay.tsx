import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { RouletteAction } from '../../../types/board';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAudio } from '../../../hooks/useAudio';

interface RouletteOverlayProps {
  action: RouletteAction;
  onResult: (choiceId: string) => void;
  isOwner: boolean;
  playerName: string;
}

export const RouletteOverlay = ({ action, onResult, isOwner, playerName }: RouletteOverlayProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [resultId, setResultId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const { playSe } = useAudio();
  
  const choices = action.choices;
  const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0);

  const spin = () => {
    if (isSpinning || !isOwner) return;
    
    setIsSpinning(true);
    playSe('roulette');
    
    // 重みに基づいて当選を決定
    let random = Math.random() * totalWeight;
    let selectedId = choices[0].id;
    let currentWeight = 0;
    let targetIndex = 0;
    
    for (let i = 0; i < choices.length; i++) {
      currentWeight += choices[i].weight;
      if (random <= currentWeight) {
        selectedId = choices[i].id;
        targetIndex = i;
        break;
      }
    }

    setResultId(selectedId);

    // 回転アニメーションの設定
    const spins = 5 + Math.floor(Math.random() * 5); // 5〜10回転
    const sectionAngle = 360 / choices.length;
    const targetAngle = spins * 360 + (360 - (targetIndex * sectionAngle + sectionAngle / 2));
    
    setRotation(targetAngle);

    setTimeout(() => {
      setIsSpinning(false);
      setShowResult(true);
      playSe('roulette_stop');
      setTimeout(() => {
        onResult(selectedId);
      }, 2000);
    }, 4000);
  };

  const selectedChoice = choices.find(c => c.id === resultId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-lg p-6 flex flex-col items-center"
      >
        <h2 className="text-3xl font-black text-white mb-8 tracking-wider drop-shadow-lg flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-yellow-400 fill-current" />
          {action.title}
        </h2>

        <div className="relative w-80 h-80 md:w-96 md:h-96">
          {/* 指針 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 w-8 h-10 bg-white shadow-xl clip-path-triangle" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
          
          {/* ルーレット本体 */}
          <motion.div
            animate={{ rotate: rotation }}
            transition={{ duration: 4, ease: [0.15, 0, 0.15, 1] }}
            className="w-full h-full rounded-full border-8 border-white shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden relative bg-slate-800"
          >
            {choices.map((choice, i) => {
              const angle = 360 / choices.length;
              const rotate = i * angle;
              return (
                <div
                  key={choice.id}
                  className="absolute top-0 left-1/2 w-1/2 h-full origin-left flex items-center"
                  style={{
                    backgroundColor: choice.color,
                    transform: `rotate(${rotate}deg)`,
                    clipPath: `polygon(0 0, 100% ${Math.tan((angle * Math.PI) / 360) * 100}%, 100% -${Math.tan((angle * Math.PI) / 360) * 100}%)`,
                  }}
                >
                  <span
                    className="ml-24 md:ml-32 font-bold text-white text-sm md:text-lg whitespace-nowrap transform -rotate-90 origin-center"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                  >
                    {choice.label}
                  </span>
                </div>
              );
            })}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-white rounded-full shadow-inner border-4 border-slate-100 flex items-center justify-center">
                <div className="w-2 h-2 bg-slate-400 rounded-full" />
              </div>
            </div>
          </motion.div>
        </div>

        {!isSpinning && !showResult && (
          isOwner ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={spin}
              className="mt-12 px-12 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-xl rounded-full shadow-[0_10px_20px_rgba(245,158,11,0.4)] hover:shadow-[0_15px_30px_rgba(245,158,11,0.6)] transition-all"
            >
              回す！
            </motion.button>
          ) : (
            <div className="mt-12 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
              <p className="text-white font-bold text-lg">{playerName} さんが回転させています...</p>
            </div>
          )
        )}

        <AnimatePresence>
          {showResult && selectedChoice && (
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <GlassCard className="p-8 text-center bg-white/90 shadow-2xl border-4" style={{ borderColor: selectedChoice.color }}>
                <p className="text-sm font-bold text-slate-500 mb-2">当選！</p>
                <h3 className="text-4xl font-black mb-4" style={{ color: selectedChoice.color }}>
                  {selectedChoice.label}
                </h3>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
