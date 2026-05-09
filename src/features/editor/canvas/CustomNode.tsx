import { Handle, Position, NodeResizer } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NodeData } from '../../../types/board';
import { PlayerIcon } from '../../../components/ui/PlayerIcon';
import { cn } from '../../../lib/cn';

const typeColors: Record<string, string> = {
  start: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
  goal: 'bg-gradient-to-br from-pink-500 to-rose-600',
  plus: 'bg-gradient-to-br from-blue-400 to-blue-600',
  minus: 'bg-gradient-to-br from-red-400 to-red-600',
  stop: 'bg-gradient-to-br from-orange-400 to-orange-600',
  normal: 'bg-gradient-to-br from-slate-400 to-slate-600',
  area: 'bg-sky-300/20',
};

const typeLabels: Record<string, string> = {
  start: 'START',
  goal: 'GOAL',
  plus: 'プラス',
  minus: 'マイナス',
  stop: 'ストップ',
  normal: '通常',
  area: 'エリア',
};

const sizeClasses: Record<string, string> = {
  small: 'w-24 h-24 text-sm',
  medium: 'w-32 h-32 text-base',
  large: 'w-40 h-40 text-lg',
};

// ハンドル共通スタイル（大きめ＋ホバーエフェクト）
const handleClass = 'w-5 h-5 !bg-purple-500 border-2 !border-white hover:!bg-pink-500 hover:scale-125 transition-all cursor-crosshair z-10';

export const CustomNode = ({ data, selected }: { data: NodeData, selected?: boolean }) => {
  const players = data.playersOnNode || [];

  if (data.nodeType === 'area') {
    return (
      <div
        className={cn(
          'relative rounded-3xl border-2 border-dashed shadow-inner backdrop-blur-[2px] transition-all',
          selected ? 'border-purple-400 ring-4 ring-purple-200' : 'border-white/70'
        )}
        style={{
          width: '100%',
          height: '100%',
          minWidth: 100,
          minHeight: 50,
          background: `${data.areaColor || '#38bdf8'}22`,
          boxShadow: `inset 0 0 0 1px ${data.areaColor || '#38bdf8'}44`,
        }}
      >
        <NodeResizer 
          minWidth={200} 
          minHeight={100} 
          isVisible={selected} 
          lineClassName="border-purple-400 border-2" 
          handleClassName="w-3 h-3 bg-white border-2 border-purple-500 rounded-sm"
        />
        <div
          className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold text-white shadow-md select-none"
          style={{ background: data.areaColor || '#38bdf8' }}
        >
          {data.label}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl text-white shadow-lg transition-transform',
        typeColors[data.nodeType],
        sizeClasses[data.size || 'medium'],
        selected && 'ring-4 ring-purple-400 ring-offset-2',
        data.isStop && !selected && 'ring-4 ring-orange-500 ring-offset-2'
      )}
      style={data.color ? { background: data.color } : {}}
    >
      {/* 入力ハンドル (Target = 上) */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(handleClass, '!bg-green-500 hover:!bg-green-400')}
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
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1 z-20">
          <AnimatePresence>
            {players.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: idx * 0.05 }}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-lg border-2',
                  p.isMe ? 'border-yellow-400 bg-yellow-50/90' : 'border-white bg-white/90'
                )}
                title={p.name}
              >
                <PlayerIcon icon={p.icon} size="sm" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 出力ハンドル (Source = 下、左、右) - 大きくて掴みやすい */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={handleClass}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleClass}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={handleClass}
      />
    </div>
  );
};
