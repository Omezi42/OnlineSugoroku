import { useState } from 'react';
import { motion, useAnimation, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { DiceType } from '../../../types/board';

interface DiceProps {
  diceType: DiceType;
  onRollComplete: (result: number) => void;
  disabled?: boolean;
  reducedMotion?: boolean;
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

export const Dice = ({ diceType, onRollComplete, disabled = false, reducedMotion = false }: DiceProps) => {
  const [result, setResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const controls = useAnimation();
  const systemReducedMotion = useReducedMotion();
  const shouldReduceMotion = systemReducedMotion || reducedMotion;

  const getRotationForValue = (val: number) => {
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

    if (!shouldReduceMotion) {
      await controls.start({
        y: [0, -60, 0],
        rotateX: [0, 360, 720],
        rotateY: [0, 540, 1080],
        scale: [1, 1.1, 1],
        transition: { duration: 0.8, ease: "easeInOut" }
      });
    }

    setResult(rollResult);
    setIsRolling(false);
    
    const finalRot = getRotationForValue(rollResult);
    await controls.start({
      rotateX: finalRot.x,
      rotateY: finalRot.y,
      rotateZ: finalRot.z,
      transition: shouldReduceMotion
        ? { duration: 0.05 }
        : { duration: 0.4, type: "spring", stiffness: 260, damping: 20 }
    });

    setTimeout(() => {
      onRollComplete(rollResult);
    }, 500);
  };

  const faceStyle = "absolute w-full h-full bg-white border border-slate-200 flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,0.05)] rounded-lg backface-hidden overflow-hidden";
  const dotStyle = "w-3 h-3 rounded-full bg-slate-800 shadow-sm";

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        className="relative w-20 h-20 perspective-1000 cursor-pointer"
        onClick={handleRoll}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleRoll();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${diceType}を振る`}
        aria-disabled={disabled || isRolling}
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
          {/* 隙間を埋めるための中央の立方体（コア） */}
          <div className="absolute inset-0 bg-slate-100" style={{ transform: 'scale(0.99)' }} />

          {diceType === '1d6' ? (
            <>
              {/* 1: Front */}
              <div className={faceStyle} style={{ transform: 'translateZ(40px)' }}>
                <div className="w-6 h-6 rounded-full bg-red-500 shadow-sm" />
              </div>
              {/* 6: Back */}
              <div className={faceStyle} style={{ transform: 'rotateY(180deg) translateZ(40px)' }}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {[...Array(6)].map((_, i) => <div key={i} className={dotStyle} />)}
                </div>
              </div>
              {/* 2: Right */}
              <div className={faceStyle} style={{ transform: 'rotateY(90deg) translateZ(40px)' }}>
                <div className="w-full h-full p-4 relative">
                  <div className={dotStyle + " absolute top-4 left-4"} />
                  <div className={dotStyle + " absolute bottom-4 right-4"} />
                </div>
              </div>
              {/* 5: Left */}
              <div className={faceStyle} style={{ transform: 'rotateY(-90deg) translateZ(40px)' }}>
                <div className="w-full h-full p-3 grid grid-cols-3 grid-rows-3 items-center justify-items-center">
                  <div className={dotStyle} /> <div /> <div className={dotStyle} />
                  <div /> <div className={dotStyle} /> <div />
                  <div className={dotStyle} /> <div /> <div className={dotStyle} />
                </div>
              </div>
              {/* 3: Top */}
              <div className={faceStyle} style={{ transform: 'rotateX(90deg) translateZ(40px)' }}>
                <div className="w-full h-full p-4 relative">
                  <div className={dotStyle + " absolute top-4 left-4"} />
                  <div className={dotStyle + " absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"} />
                  <div className={dotStyle + " absolute bottom-4 right-4"} />
                </div>
              </div>
              {/* 4: Bottom */}
              <div className={faceStyle} style={{ transform: 'rotateX(-90deg) translateZ(40px)' }}>
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => <div key={i} className={dotStyle} />)}
                </div>
              </div>
            </>
          ) : (
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
