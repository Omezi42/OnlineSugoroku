import { useEditorStore } from '../store';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { NodeSize } from '../../../types/board';
import { ActionEditor } from './ActionEditor';

export const NodeConfigPanel = () => {
  const { nodes, updateNodeData } = useEditorStore();
  
  const selectedNode = nodes.find(n => n.selected);
  if (!selectedNode) return null;
  const { id, data } = selectedNode;

  // 画像アップロード処理
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      // 画像を圧縮してBase64で保存（簡易版）
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200;
        let w = img.width, h = img.height;
        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
        else { w = (w / h) * maxSize; h = maxSize; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        updateNodeData(id, { image: canvas.toDataURL('image/jpeg', 0.7) });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 z-10">
      <GlassCard className="h-full flex flex-col p-4 md:p-6 overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">マスの設定</h2>
        </div>

        <div className="space-y-5">
          {/* ラベル */}
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

          {/* 詳細テキスト */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">詳細テキスト</label>
            <textarea 
              className="w-full p-2 rounded-lg border border-slate-200 bg-white/50 focus:ring-2 focus:ring-purple-400 outline-none transition-all min-h-[60px]"
              value={data.description}
              onChange={(e) => updateNodeData(id, { description: e.target.value })}
              placeholder="マスの説明を入力"
            />
          </div>

          {/* サイズ & ストップ */}
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

          {/* カスタムカラー */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">カスタムカラー</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.color || '#6366f1'}
                onChange={(e) => updateNodeData(id, { color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
              />
              {data.color && (
                <button
                  onClick={() => updateNodeData(id, { color: undefined })}
                  className="text-xs text-slate-500 hover:text-red-500"
                >
                  リセット
                </button>
              )}
            </div>
          </div>

          {/* マス画像 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">マス画像</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full text-sm text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            {data.image && (
              <div className="mt-2 relative">
                <img src={data.image as string} alt="マス画像" className="w-full h-20 object-cover rounded-lg" />
                <button
                  onClick={() => updateNodeData(id, { image: undefined })}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* アクション設定 - 12種対応 */}
          <ActionEditor nodeId={id} actions={data.actions || []} />
        </div>
      </GlassCard>
    </div>
  );
};
