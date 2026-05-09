import { useState, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
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

export const Dice = ({ diceType, onRollComplete, disabled = false }: DiceProps) => {
  const [result, setResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const controls = useAnimation();

  const getRotationForValue = (val: number) => {
    // 1d6以外（コインや1d10など）の場合は正面(0,0,0)に数字を出すだけにする
    if (diceType !== '1d6') return { x: 0, y: 0, z: 0 };
    switch (val) {
      case 1: return { x: 0, y: 0, z: 0 };
      case 2: return { x: 0, y: -90, z: 0 };
      case 3: return { x: -90, y: 0, z: 0 };
      case 4: return { x: 90, y: 0, z: 0 };
      case 5: return { x: 0, y: 90, z: 0 };
      case 6: return { x: 180, y: 0, z: 0 };
      default: return { x: 0, y: 0, z: 0 };
    }
  };

  const handleRoll = async () => {
    if (disabled || isRolling) return;
    
    setIsRolling(true);
    const rollResult = rollSingleDice(diceType);
    setResult(null);

    // 物理的な跳ね返りと回転
    await controls.start({
      y: [0, -80, 0],
      rotateX: [0, 360, 720],
      rotateY: [0, 540, 1080],
      scale: [1, 1.1, 1],
      transition: { duration: 1.0, ease: "easeInOut" }
    });

    setResult(rollResult);
    setIsRolling(false);
    
    // 確定後の角度へ
    const finalRot = getRotationForValue(rollResult);
    await controls.start({
      rotateX: finalRot.x,
      rotateY: finalRot.y,
      rotateZ: finalRot.z,
      transition: { duration: 0.3, type: "spring", stiffness: 200 }
    });

    setTimeout(() => {
      onRollComplete(rollResult);
    }, 600);
  };

  const faceStyle = "absolute w-full h-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,0.05)] rounded-xl backface-hidden";

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        className="relative w-20 h-20 perspective-1000 cursor-pointer"
        onClick={handleRoll}
        whileHover={!disabled && !isRolling ? { scale: 1.05 } : {}}
        whileTap={!disabled && !isRolling ? { scale: 0.95 } : {}}
        style={{ perspective: '1000px' }}
      >
        <motion.div
          animate={controls}
          initial={getRotationForValue(result || 1)}
          className="w-full h-full relative"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {diceType === '1d6' ? (
            <>
              {/* 1d6の3D面 */}
              <div className={faceStyle} style={{ transform: 'translateZ(40px)' }}>
                <div className="w-5 h-5 rounded-full bg-red-500 shadow-sm" />
              </div>
              <div className={faceStyle} style={{ transform: 'rotateY(180deg) translateZ(40px)' }}>
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(6)].map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-slate-800" />)}
                </div>
              </div>
              <div className={faceStyle} style={{ transform: 'rotateY(90deg) translateZ(40px)' }}>
                <div className="grid grid-cols-2 gap-4 -rotate-45">
                  {[...Array(2)].map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-slate-800" />)}
                </div>
              </div>
              <div className={faceStyle} style={{ transform: 'rotateY(-90deg) translateZ(40px)' }}>
                <div className="grid grid-cols-2 gap-2 p-3">
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-800 col-span-2 mx-auto" />
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                </div>
              </div>
              <div className={faceStyle} style={{ transform: 'rotateX(90deg) translateZ(40px)' }}>
                <div className="flex flex-col gap-2 -rotate-45">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800 self-start" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800 self-center" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800 self-end" />
                </div>
              </div>
              <div className={faceStyle} style={{ transform: 'rotateX(-90deg) translateZ(40px)' }}>
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-slate-800" />)}
                </div>
              </div>
            </>
          ) : (
            /* 1d6以外は数字を表示するのみのシンプルな3Dボックス */
            <div className={faceStyle} style={{ transform: 'translateZ(40px)' }}>
               <span className="text-4xl font-black text-slate-800">
                 {isRolling ? '?' : (result || 'Go!')}
               </span>
            </div>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {!isRolling && result !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm font-bold text-purple-600 bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-purple-100"
          >
            {result} が出ました
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

