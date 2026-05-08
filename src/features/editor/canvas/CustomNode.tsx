import { Handle, Position } from '@xyflow/react';
import type { NodeData } from '../../../types/board';
import { cn } from '../../../components/ui/Button';

const typeColors = {
  start: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
  goal: 'bg-gradient-to-br from-pink-500 to-rose-600',
  plus: 'bg-gradient-to-br from-blue-400 to-blue-600',
  minus: 'bg-gradient-to-br from-red-400 to-red-600',
  stop: 'bg-gradient-to-br from-orange-400 to-orange-600',
  normal: 'bg-gradient-to-br from-slate-400 to-slate-600',
};

const typeLabels = {
  start: 'START',
  goal: 'GOAL',
  plus: 'プラス',
  minus: 'マイナス',
  stop: 'ストップ',
  normal: '通常',
};

const sizeClasses = {
  small: 'w-24 h-24 text-sm',
  medium: 'w-32 h-32 text-base',
  large: 'w-40 h-40 text-lg',
};

export const CustomNode = ({ data, selected }: { data: NodeData, selected?: boolean }) => {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl text-white shadow-lg transition-transform',
        typeColors[data.nodeType],
        sizeClasses[data.size || 'medium'],
        selected && 'ring-4 ring-purple-400 ring-offset-2',
        data.isStop && 'ring-4 ring-orange-500 ring-offset-2' // Stopマスは目立つように
      )}
      style={data.color ? { background: data.color } : {}}
    >
      {/* 接続ポイント (Target = 上) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 !bg-purple-500 border-2 !border-white"
      />

      <div className="absolute top-2 left-0 right-0 text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full">
          {typeLabels[data.nodeType]}
        </span>
      </div>

      <div className="text-center font-bold px-2 break-words max-w-full z-10 drop-shadow-md">
        {data.label}
      </div>

      {data.image && (
        <div 
          className="absolute inset-0 rounded-2xl opacity-40 bg-cover bg-center mix-blend-overlay"
          style={{ backgroundImage: `url(${data.image})` }}
        />
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
