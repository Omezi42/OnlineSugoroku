import type { NodeType, NodeSize } from '../../../types/board';
import { GlassCard } from '../../../components/ui/GlassCard';
import { X } from 'lucide-react';

import { useEditorStore } from '../store';
import { useReactFlow } from '@xyflow/react';

export const Sidebar = ({ onClose }: { onClose?: () => void }) => {
  const { addNode } = useEditorStore();
  const { getViewport } = useReactFlow();

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onAddItem = (type: NodeType) => {
    const { x, y, zoom } = getViewport();
    // 画面中央付近に配置（重なり防止のため少しランダムにずらす）
    const offset = (Math.random() - 0.5) * 40;
    const position = {
      x: -x / zoom + (window.innerWidth / 2 - 150) / zoom + offset,
      y: -y / zoom + (window.innerHeight / 2 - 150) / zoom + offset,
    };

    const newNode = {
      id: `node-${Date.now()}`,
      type: 'custom',
      position,
      style: type === 'area' ? { width: 400, height: 200 } : undefined,
      zIndex: type === 'area' ? -10 : 0,
      data: {
        label: type === 'area' ? '新しいエリア' : '新しいマス',
        description: '',
        nodeType: type,
        size: 'medium' as NodeSize,
        isStop: type === 'stop',
        actions: [],
        areaColor: type === 'area' ? '#38bdf8' : undefined,
        areaWidth: type === 'area' ? 400 : undefined,
        areaHeight: type === 'area' ? 200 : undefined,
      },
    };
    addNode(newNode);
    
    // モバイルの場合はサイドバーを閉じる
    if (window.innerWidth < 768) {
      onClose?.();
    }
  };

  const nodeTypes: { type: NodeType; label: string; emoji: string; colorClass: string }[] = [
    { type: 'start', label: 'スタート', emoji: '🚩', colorClass: 'bg-gradient-to-r from-yellow-400 to-yellow-600' },
    { type: 'goal', label: 'ゴール', emoji: '🏁', colorClass: 'bg-gradient-to-r from-pink-500 to-rose-600' },
    { type: 'plus', label: 'プラス', emoji: '💎', colorClass: 'bg-gradient-to-r from-blue-400 to-blue-600' },
    { type: 'minus', label: 'マイナス', emoji: '💀', colorClass: 'bg-gradient-to-r from-red-400 to-red-600' },
    { type: 'stop', label: 'ストップ', emoji: '🛑', colorClass: 'bg-gradient-to-r from-orange-400 to-orange-600' },
    { type: 'normal', label: '通常マス', emoji: '⬜', colorClass: 'bg-gradient-to-r from-slate-400 to-slate-600' },
    { type: 'area', label: 'エリア枠', emoji: '🖼️', colorClass: 'bg-sky-400' },
  ];

  return (
    <GlassCard id="node-palette" className="w-72 md:w-64 h-full flex flex-col gap-4 rounded-none border-r border-t-0 border-b-0 border-l-0 shadow-xl overflow-y-auto z-10">
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold">🧩 マスを追加</h2>
          <button 
            onClick={onClose}
            className="md:hidden p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          クリックで追加、またはキャンバスへドラッグ＆ドロップしてください。
        </p>
        <div className="flex flex-col gap-2">
          {nodeTypes.map((item) => (
            <div
              key={item.type}
              className={`p-3 rounded-xl text-white font-medium cursor-grab text-center shadow-md hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 justify-center ${item.colorClass}`}
              onDragStart={(event) => onDragStart(event, item.type)}
              onClick={() => onAddItem(item.type)}
              draggable
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

      </div>
    </GlassCard>
  );
};
