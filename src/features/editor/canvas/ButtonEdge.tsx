import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { X, Check, XCircle, Shuffle } from 'lucide-react';
import { useEditorStore } from '../store';
import { useState } from 'react';

export const ButtonEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
}: EdgeProps) => {
  const updateEdgeLabel = useEditorStore(state => state.updateEdgeLabel);
  const onEdgesChange = useEditorStore(state => state.onEdgesChange);
  
  const removeEdge = (edgeId: string) => onEdgesChange([{ id: edgeId, type: 'remove' }]);
  
  const [showPresets, setShowPresets] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onRemoveClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    removeEdge(id);
  };

  const onLabelClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setShowPresets(!showPresets);
  };

  const setLabel = (newLabel: string) => {
    updateEdgeLabel(id, newLabel);
    setShowPresets(false);
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex flex-col items-center gap-1 group"
        >
          {label && (
            <div 
              className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm mb-1 cursor-pointer hover:scale-105 transition-transform"
              onClick={onLabelClick}
            >
              {label}
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <button
              className="w-6 h-6 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-all cursor-pointer"
              onClick={onRemoveClick}
              title="接続を削除"
            >
              <X size={14} strokeWidth={3} />
            </button>
            
            {!label && (
              <button
                className="w-6 h-6 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center text-purple-500 hover:bg-purple-50 hover:scale-110 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                onClick={onLabelClick}
                title="ラベルを設定"
              >
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
              </button>
            )}
          </div>

          {showPresets && (
            <div className="absolute top-8 bg-white/95 backdrop-blur-md border border-purple-100 rounded-xl shadow-xl p-1.5 flex gap-1 z-50 whitespace-nowrap animate-in fade-in zoom-in duration-200">
              <button onClick={() => setLabel('成立')} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 flex items-center gap-1 text-[10px] font-bold">
                <Check size={12} /> 成立
              </button>
              <button onClick={() => setLabel('不成立')} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 flex items-center gap-1 text-[10px] font-bold">
                <XCircle size={12} /> 不成立
              </button>
              <button onClick={() => setLabel('50%')} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 flex items-center gap-1 text-[10px] font-bold">
                <Shuffle size={12} /> 50%
              </button>
              <button onClick={() => setLabel('')} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 text-[10px] font-bold">
                クリア
              </button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
