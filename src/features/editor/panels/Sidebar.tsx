import { NodeType } from '../../../types/board';
import { GlassCard } from '../../../components/ui/GlassCard';

export const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeTypes: { type: NodeType; label: string; colorClass: string }[] = [
    { type: 'start', label: 'スタート', colorClass: 'bg-yellow-500' },
    { type: 'goal', label: 'ゴール', colorClass: 'bg-rose-500' },
    { type: 'plus', label: 'プラス', colorClass: 'bg-blue-500' },
    { type: 'minus', label: 'マイナス', colorClass: 'bg-red-500' },
    { type: 'stop', label: 'ストップ', colorClass: 'bg-orange-500' },
    { type: 'normal', label: '通常マス', colorClass: 'bg-slate-500' },
  ];

  return (
    <GlassCard className="w-64 h-full flex flex-col gap-4 rounded-none border-r border-t-0 border-b-0 border-l-0 shadow-xl overflow-y-auto z-10">
      <div>
        <h2 className="text-lg font-bold mb-4">マスを追加</h2>
        <p className="text-xs text-slate-500 mb-4">
          下のマスをキャンバスにドラッグ＆ドロップしてください。
        </p>
        <div className="flex flex-col gap-3">
          {nodeTypes.map((item) => (
            <div
              key={item.type}
              className={`p-3 rounded-xl text-white font-medium cursor-grab text-center shadow-md hover:brightness-110 transition-all ${item.colorClass}`}
              onDragStart={(event) => onDragStart(event, item.type)}
              draggable
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-8 border-t border-slate-200/50 pt-6">
        <h2 className="text-lg font-bold mb-4">盤面設定</h2>
        {/* 後ほどボード全体のパラメーター設定やサイコロ設定を配置 */}
        <button className="w-full p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-700 transition-colors">
          ボード設定を開く
        </button>
      </div>
    </GlassCard>
  );
};
