import { useEditorStore } from '../store';
import { GlassCard } from '../../../components/ui/GlassCard';
import { NodeSize } from '../../../types/board';
import { X } from 'lucide-react';

export const NodeConfigPanel = () => {
  const { nodes, updateNodeData } = useEditorStore();
  
  // React Flow で selected = true になっているノードを探す
  const selectedNode = nodes.find(n => n.selected);

  if (!selectedNode) {
    return null;
  }

  const { id, data } = selectedNode;

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 z-10">
      <GlassCard className="h-full flex flex-col p-4 md:p-6 overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">マスの設定</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ラベル (タイトル)</label>
            <input 
              type="text" 
              className="w-full p-2 rounded-lg border border-slate-200 bg-white/50 focus:ring-2 focus:ring-purple-400 outline-none transition-all"
              value={data.label}
              onChange={(e) => updateNodeData(id, { label: e.target.value })}
              placeholder="例: 宝箱を発見！"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">詳細テキスト</label>
            <textarea 
              className="w-full p-2 rounded-lg border border-slate-200 bg-white/50 focus:ring-2 focus:ring-purple-400 outline-none transition-all min-h-[80px]"
              value={data.description}
              onChange={(e) => updateNodeData(id, { description: e.target.value })}
              placeholder="マスの説明を入力"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">サイズ</label>
              <select 
                className="w-full p-2 rounded-lg border border-slate-200 bg-white/50 focus:ring-2 focus:ring-purple-400 outline-none transition-all"
                value={data.size}
                onChange={(e) => updateNodeData(id, { size: e.target.value as NodeSize })}
              >
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
              </select>
            </div>
            
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  checked={data.isStop}
                  onChange={(e) => updateNodeData(id, { isStop: e.target.checked })}
                />
                <span className="text-sm font-medium text-slate-700">必ず止まる</span>
              </label>
            </div>
          </div>

          {/* 後ほど12種のアクションの設定UIをここに追加する */}
          <div className="pt-4 border-t border-slate-200/50 mt-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">アクション設定</h3>
            <button className="w-full py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors">
              + アクションを追加
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
