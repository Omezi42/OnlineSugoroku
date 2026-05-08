import { Handle, Position } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NodeData } from '../../../types/board';
import { cn } from '../../../components/ui/Button';

const typeColors: Record<string, string> = {
  start: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
  goal: 'bg-gradient-to-br from-pink-500 to-rose-600',
  plus: 'bg-gradient-to-br from-blue-400 to-blue-600',
  minus: 'bg-gradient-to-br from-red-400 to-red-600',
  stop: 'bg-gradient-to-br from-orange-400 to-orange-600',
  normal: 'bg-gradient-to-br from-slate-400 to-slate-600',
};

const typeLabels: Record<string, string> = {
  start: 'START',
  goal: 'GOAL',
  plus: 'プラス',
  minus: 'マイナス',
  stop: 'ストップ',
  normal: '通常',
};

const sizeClasses: Record<string, string> = {
  small: 'w-24 h-24 text-sm',
  medium: 'w-32 h-32 text-base',
  large: 'w-40 h-40 text-lg',
};

export const CustomNode = ({ data, selected }: { data: NodeData, selected?: boolean }) => {
  const players = data.playersOnNode || [];

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl text-white shadow-lg transition-transform',
        typeColors[data.nodeType],
        sizeClasses[data.size || 'medium'],
        selected && 'ring-4 ring-purple-400 ring-offset-2',
        data.isStop && 'ring-4 ring-orange-500 ring-offset-2'
      )}
      style={data.color ? { background: data.color } : {}}
    >
      {/* 接続ポイント (Target = 上) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 !bg-purple-500 border-2 !border-white"
      />

      {/* マスの種類ラベル */}
      <div className="absolute top-2 left-0 right-0 text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full">
          {typeLabels[data.nodeType]}
        </span>
      </div>

      {/* マスのタイトル */}
      <div className="text-center font-bold px-2 break-words max-w-full z-10 drop-shadow-md">
        {data.label}
      </div>

      {/* マス画像（背景オーバーレイ） */}
      {data.image && (
        <div 
          className="absolute inset-0 rounded-2xl opacity-40 bg-cover bg-center mix-blend-overlay"
          style={{ backgroundImage: `url(${data.image})` }}
        />
      )}

      {/* アクション数バッジ */}
      {data.actions && data.actions.length > 0 && (
        <div className="absolute bottom-2 right-2 bg-black/30 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          ⚡{data.actions.length}
        </div>
      )}

      {/* プレイヤーコマ表示 */}
      {players.length > 0 && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1 z-20">
          <AnimatePresence>
            {players.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, delay: idx * 0.05 }}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-lg border-2',
                  p.isMe ? 'border-yellow-400 bg-yellow-50' : 'border-white bg-white/90'
                )}
                title={p.name}
              >
                {p.icon}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 接続ポイント (Source = 下、左、右) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-4 h-4 !bg-purple-500 border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-4 h-4 !bg-purple-500 border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="w-4 h-4 !bg-purple-500 border-2 !border-white"
      />
    </div>
  );
};
