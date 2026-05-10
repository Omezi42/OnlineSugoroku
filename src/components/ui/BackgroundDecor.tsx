import React from 'react';
import { motion } from 'framer-motion';

export const BackgroundDecor: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-slate-50 pointer-events-none">
      {/* メインのグラデーション背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50" />
      
      {/* 動くオーブ 1 */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -80, 120, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -top-20 -left-20 w-96 h-96 bg-purple-200/30 rounded-full blur-[80px]"
      />

      {/* 動くオーブ 2 */}
      <motion.div
        animate={{
          x: [0, -120, 80, 0],
          y: [0, 100, -100, 0],
          scale: [1, 0.8, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-pink-200/20 rounded-full blur-[100px]"
      />

      {/* 動くオーブ 3 */}
      <motion.div
        animate={{
          x: [0, 150, -100, 0],
          y: [0, 150, 50, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -bottom-40 left-1/4 w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-[120px]"
      />

      {/* グリッドオーバーレイ (薄く) */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} 
      />
    </div>
  );
};
