import { useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { DiceType } from '../../../types/board';

interface DiceProps {
  diceType: DiceType;
  onRollComplete: (result: number) => void;
  disabled?: boolean;
}

export const Dice = ({ diceType, onRollComplete, disabled = false }: DiceProps) => {
  const [result, setResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const controls = useAnimation();

  // 単純化のため、1d6（6面ダイス）を基準に実装
  const maxNumber = diceType === '1d6' ? 6 : diceType === '1d10' ? 10 : diceType === '1d4' ? 4 : 6;

  const handleRoll = async () => {
    if (disabled || isRolling) return;
    
    setIsRolling(true);
    setResult(null);

    // 物理演算風のバウンドと回転アニメーション
    await controls.start({
      y: [0, -150, 0, -50, 0, -20, 0],
      rotateX: [0, 720, 1080],
      rotateY: [0, 360, 1080],
      transition: { 
        duration: 1.5,
        times: [0, 0.4, 0.6, 0.75, 0.85, 0.95, 1],
        ease: "easeOut"
      }
    });

    const rollResult = Math.floor(Math.random() * maxNumber) + 1;
    setResult(rollResult);
    setIsRolling(false);
    
    // 少し待ってから結果を通知
    setTimeout(() => {
      onRollComplete(rollResult);
    }, 800);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={controls}
        className="w-24 h-24 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex items-center justify-center relative cursor-pointer border-4 border-slate-100 perspective-1000"
        style={{ transformStyle: 'preserve-3d' }}
        onClick={handleRoll}
        whileHover={!disabled && !isRolling ? { scale: 1.05 } : {}}
        whileTap={!disabled && !isRolling ? { scale: 0.95 } : {}}
      >
        {isRolling ? (
          <span className="text-4xl animate-pulse text-purple-400">?</span>
        ) : result !== null ? (
          <span className="text-5xl font-black text-slate-800">{result}</span>
        ) : (
          <span className="text-xl font-bold text-slate-400">Roll!</span>
        )}
      </motion.div>
      
      {!isRolling && result !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-bold text-purple-600 bg-purple-100 px-4 py-1 rounded-full"
        >
          {result} が出ました！
        </motion.div>
      )}
    </div>
  );
};
