import { useState } from 'react';
import { Canvas } from './canvas/Canvas';
import { Sidebar } from './panels/Sidebar';
import { NodeConfigPanel } from './panels/NodeConfigPanel';
import { EditorToolbar } from './components/EditorToolbar';
import { useEditorStore } from './store';
import { saveBoard } from '../../services/boardService';
import { Loader2 } from 'lucide-react';

export default function Editor() {
  const { nodes, edges, boardSettings } = useEditorStore();
  const [isSaving, setIsSaving] = useState(false);
  const [boardName, setBoardName] = useState('名称未設定のすごろく');

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const boardId = await saveBoard({
        name: boardName,
        nodes,
        edges,
        settings: boardSettings,
      });
      alert(`保存しました！\nプレイ用URL: /play/${boardId}`);
      // 実際にはコピー用モーダルなどを出すが、今回は直接プレイ画面に遷移するかアラートで表示
      // navigate(`/play/${boardId}`);
    } catch (error) {
      console.error('Failed to save board:', error);
      alert('保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden relative">
      <Sidebar />
      <Canvas />
      <NodeConfigPanel />
      <EditorToolbar />
      
      {/* ヘッダー的なオーバーレイ（保存ボタンなど） */}
      <div className="absolute top-4 left-72 right-4 flex justify-between items-center pointer-events-none">
        <div className="glass-panel px-4 py-2 rounded-xl pointer-events-auto shadow-sm flex items-center">
          <input
            type="text"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            className="font-bold text-slate-800 bg-transparent outline-none w-64"
            placeholder="盤面の名前"
          />
        </div>
        <div className="pointer-events-auto">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? '保存中...' : '保存して共有'}
          </button>
        </div>
      </div>
    </div>
  );
}
