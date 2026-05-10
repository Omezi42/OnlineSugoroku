import { useState, useCallback, useRef } from 'react';
import { motion, useAnimation, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { DiceType } from '../../../types/board';
import { useAudio } from '../../../hooks/useAudio';
import { cn } from '../../../lib/cn';

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
  const [isCharging, setIsCharging] = useState(false);
  const controls = useAnimation();
  const systemReducedMotion = useReducedMotion();
  const shouldReduceMotion = systemReducedMotion || reducedMotion;
  const { playSe } = useAudio();
  const chargeStartTime = useRef<number>(0);

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

  const handleRoll = useCallback(async () => {
    if (disabled || isRolling) return;
    
    setIsRolling(true);
    setIsCharging(false);
    setResult(null);
    playSe('dice');
    
    const rollResult = rollSingleDice(diceType);

    if (!shouldReduceMotion) {
      // Phase 1: High toss with fast spin
      await controls.start({
        y: [0, -200, 0],
        x: [0, 40, 0],
        rotateX: [0, 720, 1440],
        rotateY: [0, 1080, 2160],
        rotateZ: [0, 360, 720],
        scale: [1, 1.5, 1],
        transition: { 
          duration: 1.4, 
          ease: [0.22, 1, 0.36, 1],
        }
      });

      // Phase 2: Bouncing on the ground (Randomize bounce slightly)
      await controls.start({
        y: [0, -30, 0, -15, 0],
        rotateX: [1440, 1520, 1580, 1610, 1630],
        rotateY: [2160, 2240, 2300, 2330, 2350],
        transition: { duration: 0.7, ease: "easeOut" }
      });
    }

    // Phase 3: Final landing and settling
    setResult(rollResult);
    const finalRot = getRotationForValue(rollResult);
    
    await controls.start({
      rotateX: finalRot.x,
      rotateY: finalRot.y,
      rotateZ: finalRot.z,
      transition: shouldReduceMotion
        ? { duration: 0.1 }
        : { 
            duration: 1.0, 
            type: "spring", 
            stiffness: 180, 
            damping: 10,
            mass: 1.2
          }
    });

    playSe('coin'); // Impact sound
    
    // アニメーションが完全に完了してからフラグを下ろし、通知する
    setIsRolling(false);
    onRollComplete(rollResult);
  }, [disabled, isRolling, diceType, playSe, controls, shouldReduceMotion, onRollComplete]);

  const onPointerDown = () => {
    if (disabled || isRolling) return;
    setIsCharging(true);
    chargeStartTime.current = Date.now();
  };

  const onPointerUp = () => {
    if (isCharging && !isRolling) {
      handleRoll();
    } else {
      setIsCharging(false);
    }
  };

  // UI styles
  const faceBase = "absolute w-full h-full bg-white border-2 border-slate-200/50 flex items-center justify-center rounded-2xl backface-hidden overflow-hidden";
  const faceShade = "shadow-[inset_0_0_20px_rgba(0,0,0,0.08),0_4px_10px_rgba(0,0,0,0.1)]";
  const dotBase = "w-4 h-4 rounded-full bg-slate-800 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.3)]";

  return (
    <div className="flex flex-col items-center gap-12 py-10">
      <div className="relative perspective-2000 h-32 flex items-center justify-center">
        {/* Shadow on the ground */}
        <motion.div
          animate={isRolling ? {
            scale: [1, 0.4, 1],
            opacity: [0.2, 0.05, 0.2],
            filter: ["blur(4px)", "blur(12px)", "blur(4px)"]
          } : { scale: 1, opacity: 0.2 }}
          transition={{ duration: 1.2 }}
          className="absolute -bottom-8 w-16 h-4 bg-black rounded-[100%] blur-sm pointer-events-none"
        />

        <motion.div
          className="relative w-24 h-24 cursor-pointer"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
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
          whileHover={!disabled && !isRolling ? { scale: 1.1 } : {}}
          animate={isCharging ? {
            x: [0, -2, 2, -2, 2, 0],
            y: [0, 1, -1, 1, -1, 0],
            transition: { repeat: Infinity, duration: 0.1 }
          } : {}}
          style={{ perspective: '2000px' }}
        >
          <motion.div
            animate={controls}
            initial={getRotationForValue(result || 1)}
            className="w-full h-full relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Core volume */}
            <div className="absolute inset-0 bg-slate-100 rounded-2xl" style={{ transform: 'scale(0.96)' }} />

            {diceType === '1d6' ? (
              <>
                {/* 1: Front - Red Dot */}
                <div className={cn(faceBase, faceShade)} style={{ transform: 'translateZ(48px)' }}>
                  <div className="w-9 h-9 rounded-full bg-rose-500 shadow-[inset_0_4px_8px_rgba(0,0,0,0.2),0_2px_4px_rgba(255,255,255,0.3)]" />
                </div>
                {/* 6: Back */}
                <div className={cn(faceBase, faceShade)} style={{ transform: 'rotateY(180deg) translateZ(48px)' }}>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                    {[...Array(6)].map((_, i) => <div key={i} className={dotBase} />)}
                  </div>
                </div>
                {/* 2: Right */}
                <div className={cn(faceBase, faceShade)} style={{ transform: 'rotateY(90deg) translateZ(48px)' }}>
                  <div className="w-full h-full p-5 relative">
                    <div className={dotBase + " absolute top-5 left-5"} />
                    <div className={dotBase + " absolute bottom-5 right-5"} />
                  </div>
                </div>
                {/* 5: Left */}
                <div className={cn(faceBase, faceShade)} style={{ transform: 'rotateY(-90deg) translateZ(48px)' }}>
                  <div className="w-full h-full p-4 grid grid-cols-3 grid-rows-3 items-center justify-items-center">
                    <div className={dotBase} /> <div /> <div className={dotBase} />
                    <div /> <div className={dotBase} /> <div />
                    <div className={dotBase} /> <div /> <div className={dotBase} />
                  </div>
                </div>
                {/* 3: Top */}
                <div className={cn(faceBase, faceShade)} style={{ transform: 'rotateX(90deg) translateZ(48px)' }}>
                  <div className="w-full h-full p-5 relative">
                    <div className={dotBase + " absolute top-5 left-5"} />
                    <div className={dotBase + " absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"} />
                    <div className={dotBase + " absolute bottom-5 right-5"} />
                  </div>
                </div>
                {/* 4: Bottom */}
                <div className={cn(faceBase, faceShade)} style={{ transform: 'rotateX(-90deg) translateZ(48px)' }}>
                  <div className="grid grid-cols-2 gap-5">
                    {[...Array(4)].map((_, i) => <div key={i} className={dotBase} />)}
                  </div>
                </div>
              </>
            ) : (
              <div className={cn(faceBase, faceShade, "bg-gradient-to-br from-white to-slate-50")} style={{ transform: 'translateZ(48px)' }}>
                 <span className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-slate-500 drop-shadow-sm">
                   {isRolling ? '?' : (result || 'Go')}
                 </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {!isRolling && result !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 drop-shadow-xl filter brightness-110">
              {result}
            </div>
            <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              Result
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isRolling && !result && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] font-black text-slate-300 uppercase tracking-widest animate-pulse"
        >
          Tap to Roll
        </motion.p>
      )}
    </div>
  );
};
