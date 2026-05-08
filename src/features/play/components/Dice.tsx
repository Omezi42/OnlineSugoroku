import { useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { DiceType } from '../../../types/board';

interface DiceProps {
  diceType: DiceType;
  onRollComplete: (result: number) => void;
  disabled?: boolean;
}

function rollSingleDice(diceType: DiceType): number {
  switch (diceType) {
    case '1d4': return Math.floor(Math.random() * 4) + 1;
    case '1d6': return Math.floor(Math.random() * 6) + 1;
    case '2d6': return Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
    case '1d10': return Math.floor(Math.random() * 10) + 1;
    case 'coin': return Math.floor(Math.random() * 2) + 1;
    default: return Math.floor(Math.random() * 6) + 1;
  }
}

function getDiceLabel(diceType: DiceType): string {
  switch (diceType) {
    case '1d4': return '1d4';
    case '1d6': return '1d6';
    case '2d6': return '2d6';
    case '1d10': return '1d10';
    case 'coin': return 'コイン';
    default: return '1d6';
  }
}

function playTone(frequency: number, duration: number, volume = 0.08) {
  const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.stop(context.currentTime + duration);
}

export const Dice = ({ diceType, onRollComplete, disabled = false }: DiceProps) => {
  const [result, setResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const controls = useAnimation();

  const handleRoll = async () => {
    if (disabled || isRolling) return;
    
    setIsRolling(true);
    setResult(null);
    playTone(220, 0.12, 0.05);

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

    const rollResult = rollSingleDice(diceType);
    setResult(rollResult);
    setIsRolling(false);
    playTone(520 + rollResult * 28, 0.18, 0.07);
    
    // 少し待ってから結果を通知
    setTimeout(() => {
      onRollComplete(rollResult);
    }, 800);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={controls}
        className={`w-24 h-24 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex items-center justify-center relative border-4 border-slate-100 perspective-1000 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
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
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-slate-400">Roll!</span>
            <span className="text-[10px] text-slate-300">{getDiceLabel(diceType)}</span>
          </div>
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
