import { useEffect, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorStore } from '../store';
import {
  Download, Upload, CheckCircle, AlertTriangle, Search, X, Undo2, Redo2,
  Rows3, Workflow, CircleDot, Maximize2, Magnet,
} from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { validateBoard, type ValidationResult } from '../utils/boardValidation';
import { importBoardData } from '../utils/boardImport';

export const EditorToolbar = () => {
  const {
    nodes, edges, past, future, snapToGrid,
    undo, redo, copySelected, pasteClipboard, applyLayout, setSnapToGrid,
  } = useEditorStore();
  const { fitView } = useReactFlow();
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showLayouts, setShowLayouts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const command = isMac ? event.metaKey : event.ctrlKey;
      if (!command) return;
      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if ((event.key.toLowerCase() === 'z' && event.shiftKey) || event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
      if (event.key.toLowerCase() === 'c') {
        copySelected();
      }
      if (event.key.toLowerCase() === 'v') {
        event.preventDefault();
        pasteClipboard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelected, pasteClipboard, redo, undo]);

  // JSONエクスポート
  const handleExport = () => {
    const { boardSettings } = useEditorStore.getState();
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      nodes: nodes.map(n => ({ ...n, selected: undefined })),
      edges,
      settings: boardSettings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sugoroku-board-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSONインポート
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const imported = importBoardData(data);
        if (imported.nodes && imported.edges) {
          const store = useEditorStore.getState();
          store.resetStore();
          setTimeout(() => {
            useEditorStore.setState({
              nodes: imported.nodes,
              edges: imported.edges,
              boardSettings: imported.settings || store.boardSettings,
            });
          }, 100);
          alert('盤面をインポートしました！');
        } else {
          alert('無効な盤面データです。');
        }
      } catch {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    input.click();
  };

  // バリデーション実行
  const handleValidate = () => {
    const result = validateBoard(nodes, edges);
    setValidation(result);
    setShowValidation(true);
  };

  // 検索でノードを選択・フォーカス
  const searchResults = showSearch && searchQuery
    ? nodes.filter(n => n.data.label?.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const focusNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    // 選択状態を更新
    useEditorStore.setState({
      nodes: nodes.map(n => ({ ...n, selected: n.id === nodeId })),
    });
  };

  return (
    <>
      {/* ツールバーボタン群 */}
      <div className="fixed bottom-4 left-0 right-0 z-20 pointer-events-none flex justify-center">
        <div className="glass-panel px-2 py-2 rounded-2xl shadow-xl flex items-center gap-1.5 overflow-x-auto max-w-[95vw] pointer-events-auto scrollbar-hide">
          <div className="flex items-center gap-1.5 px-1 border-r border-slate-200 mr-1">
            <button
              onClick={undo}
              disabled={past.length === 0}
              className="p-2 rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors disabled:opacity-40"
              title="元に戻す"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={future.length === 0}
              className="p-2 rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors disabled:opacity-40"
              title="やり直す"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
              snapToGrid ? 'bg-emerald-100 text-emerald-700' : 'bg-white/70 hover:bg-white text-slate-700'
            }`}
          >
            <Magnet className="w-4 h-4" />
            <span className="hidden sm:inline">グリッド</span>
          </button>

          <button
            onClick={() => setShowLayouts(!showLayouts)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
              showLayouts ? 'bg-blue-100 text-blue-700' : 'bg-white/70 hover:bg-white text-slate-700'
            }`}
          >
            <Rows3 className="w-4 h-4" />
            <span className="hidden sm:inline">整列</span>
          </button>


          <button
            onClick={() => fitView({ padding: 0.2, duration: 500 })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">全体表示</span>
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <button
            onClick={handleValidate}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">チェック</span>
          </button>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
              showSearch ? 'bg-purple-100 text-purple-700' : 'bg-white/70 hover:bg-white text-slate-700'
            }`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">検索</span>
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <button
            onClick={handleExport}
            className="p-2 rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors"
            title="エクスポート"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleImport}
            className="p-2 rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors"
            title="インポート"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* 自動整列 */}
      <AnimatePresence>
        {showLayouts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
          >
            <GlassCard className="w-[360px] p-4 shadow-xl">
              <h3 className="text-sm font-bold text-slate-800 mb-3">自動レイアウト</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'line', label: '直線', icon: Rows3 },
                  { key: 'zigzag', label: '蛇行', icon: Workflow },
                  { key: 'circle', label: '円形', icon: CircleDot },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      applyLayout(item.key as 'line' | 'zigzag' | 'circle');
                      setShowLayouts(false);
                      setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 50);
                    }}
                    className="flex flex-col items-center gap-2 rounded-xl bg-white/70 p-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 検索パネル */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
          >
            <GlassCard className="w-80 p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="マスの名前を検索..."
                  className="flex-1 text-sm bg-transparent outline-none"
                  autoFocus
                />
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map(n => (
                    <button
                      key={n.id}
                      onClick={() => focusNode(n.id)}
                      className="w-full text-left p-2 text-xs rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      {n.data.label} <span className="text-slate-400">({n.data.nodeType})</span>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">見つかりませんでした</p>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* バリデーション結果 */}
      <AnimatePresence>
        {showValidation && validation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-auto"
            onClick={() => setShowValidation(false)}
          >
            <GlassCard className="w-96 max-w-[90vw] p-6" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                {validation.ok ? (
                  <><CheckCircle className="w-5 h-5 text-green-500" /> 盤面チェックOK</>
                ) : (
                  <><AlertTriangle className="w-5 h-5 text-red-500" /> 問題があります</>
                )}
              </h3>

              {validation.errors.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-bold text-red-600 mb-1">❌ エラー</h4>
                  {validation.errors.map((e, i) => (
                    <p key={i} className="text-sm text-red-700 bg-red-50 p-2 rounded-lg mb-1">{e}</p>
                  ))}
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-bold text-yellow-600 mb-1">⚠️ 警告</h4>
                  {validation.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded-lg mb-1">{w}</p>
                  ))}
                </div>
              )}

              {validation.ok && validation.warnings.length === 0 && (
                <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  ✅ 盤面に問題は見つかりませんでした！プレイ可能です。
                </p>
              )}

              <button
                onClick={() => setShowValidation(false)}
                className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
              >
                閉じる
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
