import { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface Dice3DProps {
  value: number;
  isRolling: boolean;
  onRollingEnd?: () => void;
}

export const Dice3D = ({ value, isRolling, onRollingEnd }: Dice3DProps) => {
  const controls = useAnimation();
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });

  // 出目に応じた最終的な回転角度
  const getRotationForValue = (val: number) => {
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

  useEffect(() => {
    if (isRolling) {
      // ローリングアニメーション (ランダムに激しく回転)
      controls.start({
        rotateX: [0, 720, 1440],
        rotateY: [0, 1080, 2160],
        rotateZ: [0, 360, 720],
        scale: [1, 1.2, 1],
        transition: { duration: 1.2, ease: "easeInOut" }
      }).then(() => {
        // 出目の角度にピタッと合わせる
        const finalRot = getRotationForValue(value);
        setRotation(finalRot);
        if (onRollingEnd) onRollingEnd();
      });
    } else {
      const finalRot = getRotationForValue(value);
      setRotation(finalRot);
    }
  }, [isRolling, value, controls, onRollingEnd]);

  const faceStyle = "absolute w-full h-full bg-white border-2 border-slate-100 flex items-center justify-center text-3xl shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] rounded-xl";

  return (
    <div className="perspective-1000 w-24 h-24 flex items-center justify-center">
      <motion.div
        animate={isRolling ? undefined : {
          rotateX: rotation.x,
          rotateY: rotation.y,
          rotateZ: rotation.z
        }}
        initial={getRotationForValue(value)}
        className="relative w-16 h-16 preserve-3d"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* 1: 前面 */}
        <div className={faceStyle} style={{ transform: 'translateZ(32px)' }}>
          <div className="w-4 h-4 rounded-full bg-red-500" />
        </div>
        {/* 6: 背面 */}
        <div className={faceStyle} style={{ transform: 'rotateY(180deg) translateZ(32px)' }}>
          <div className="grid grid-cols-2 gap-2">
            {[...Array(6)].map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-slate-800" />)}
          </div>
        </div>
        {/* 2: 右面 */}
        <div className={faceStyle} style={{ transform: 'rotateY(90deg) translateZ(32px)' }}>
          <div className="grid grid-cols-2 gap-4 -rotate-45">
            {[...Array(2)].map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-slate-800" />)}
          </div>
        </div>
        {/* 5: 左面 */}
        <div className={faceStyle} style={{ transform: 'rotateY(-90deg) translateZ(32px)' }}>
          <div className="grid grid-cols-3 gap-1">
             <div className="w-2.5 h-2.5 rounded-full bg-slate-800 col-start-1" />
             <div className="w-2.5 h-2.5 rounded-full bg-slate-800 col-start-3" />
             <div className="w-2.5 h-2.5 rounded-full bg-slate-800 col-start-2" />
             <div className="w-2.5 h-2.5 rounded-full bg-slate-800 col-start-1" />
             <div className="w-2.5 h-2.5 rounded-full bg-slate-800 col-start-3" />
          </div>
        </div>
        {/* 3: 上面 */}
        <div className={faceStyle} style={{ transform: 'rotateX(90deg) translateZ(32px)' }}>
          <div className="grid grid-cols-3 gap-1 -rotate-45">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 col-start-1" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 col-start-2" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 col-start-3" />
          </div>
        </div>
        {/* 4: 下面 */}
        <div className={faceStyle} style={{ transform: 'rotateX(-90deg) translateZ(32px)' }}>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-slate-800" />)}
          </div>
        </div>
      </motion.div>
      
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
      `}</style>
    </div>
  );
};
