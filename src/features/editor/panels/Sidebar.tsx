import type { NodeType } from '../../../types/board';
import { GlassCard } from '../../../components/ui/GlassCard';
import { BoardSettingsPanel } from './BoardSettingsPanel';
import { useEditorStore } from '../store';
import { Layers } from 'lucide-react';

export const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeTypes: { type: NodeType; label: string; emoji: string; colorClass: string }[] = [
    { type: 'start', label: 'スタート', emoji: '🚩', colorClass: 'bg-gradient-to-r from-yellow-400 to-yellow-600' },
    { type: 'goal', label: 'ゴール', emoji: '🏁', colorClass: 'bg-gradient-to-r from-pink-500 to-rose-600' },
    { type: 'plus', label: 'プラス', emoji: '💎', colorClass: 'bg-gradient-to-r from-blue-400 to-blue-600' },
    { type: 'minus', label: 'マイナス', emoji: '💀', colorClass: 'bg-gradient-to-r from-red-400 to-red-600' },
    { type: 'stop', label: 'ストップ', emoji: '🛑', colorClass: 'bg-gradient-to-r from-orange-400 to-orange-600' },
    { type: 'normal', label: '通常マス', emoji: '⬜', colorClass: 'bg-gradient-to-r from-slate-400 to-slate-600' },
  ];

  return (
    <GlassCard className="w-64 h-full flex flex-col gap-4 rounded-none border-r border-t-0 border-b-0 border-l-0 shadow-xl overflow-y-auto z-10">
      <div>
        <h2 className="text-lg font-bold mb-2">🧩 マスを追加</h2>
        <p className="text-xs text-slate-500 mb-4">
          下のマスをキャンバスにドラッグ＆ドロップしてください。
        </p>
        <div className="flex flex-col gap-2">
          {nodeTypes.map((item) => (
            <div
              key={item.type}
              className={`p-3 rounded-xl text-white font-medium cursor-grab text-center shadow-md hover:brightness-110 hover:scale-[1.02] transition-all flex items-center gap-2 justify-center ${item.colorClass}`}
              onDragStart={(event) => onDragStart(event, item.type)}
              draggable
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => useEditorStore.getState().addArea()}
          className="mt-4 w-full p-3 rounded-xl bg-white/70 border-2 border-dashed border-purple-200 text-purple-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple-50 hover:border-purple-300 transition-all shadow-sm"
        >
          <Layers className="w-4 h-4" />
          エリア（枠）を追加
        </button>
      </div>
      
      <div className="mt-6 border-t border-slate-200/50 pt-6">
        <h2 className="text-lg font-bold mb-4">⚙️ 盤面設定</h2>
        <BoardSettingsPanel />
      </div>
    </GlassCard>
  );
};
