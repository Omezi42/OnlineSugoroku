import { useEffect, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorStore } from '../store';
import {
  Download, Upload, CheckCircle, AlertTriangle, Search, X, Undo2, Redo2,
  Copy, ClipboardPaste, Rows3, Workflow, CircleDot, PanelTopOpen, Map as MapIcon, Maximize2, Magnet,
} from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { validateBoard, type ValidationResult } from '../utils/boardValidation';
import { importBoardData } from '../utils/boardImport';

export const EditorToolbar = () => {
  const {
    nodes, edges, past, future, clipboard, snapToGrid, gridSize,
    undo, redo, copySelected, pasteClipboard, applyLayout, applyTemplate, addArea, setSnapToGrid, setGridSize, snapSelectedToGrid,
  } = useEditorStore();
  const { fitView } = useReactFlow();
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
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
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="glass-panel px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2">
          <button
            onClick={undo}
            disabled={past.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors disabled:opacity-40"
            title="元に戻す"
          >
            <Undo2 className="w-3.5 h-3.5" />
            戻す
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors disabled:opacity-40"
            title="やり直す"
          >
            <Redo2 className="w-3.5 h-3.5" />
            やり直し
          </button>
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
              snapToGrid ? 'bg-emerald-100 text-emerald-700' : 'bg-white/70 hover:bg-white text-slate-700'
            }`}
            title="マスをグリッドに吸着して、ピッタリ配置します"
          >
            <Magnet className="w-3.5 h-3.5" />
            吸着
          </button>
          <select
            value={gridSize}
            onChange={(event) => setGridSize(Number(event.target.value))}
            className="rounded-xl bg-white/70 px-2 py-1.5 text-xs font-bold text-slate-700 outline-none"
            title="グリッド幅"
          >
            {[16, 24, 32, 48].map((size) => <option key={size} value={size}>{size}px</option>)}
          </select>
          <button
            onClick={snapSelectedToGrid}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors"
            title="選択中のマスを一番近いグリッドへそろえます"
          >
            ピッタリ
          </button>
          <div className="w-px h-6 bg-slate-300" />
          <button
            onClick={copySelected}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors"
            title="選択中のマスをコピー"
          >
            <Copy className="w-3.5 h-3.5" />
            コピー
          </button>
          <button
            onClick={pasteClipboard}
            disabled={!clipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors disabled:opacity-40"
            title="コピーしたマスを貼り付け"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            貼付
          </button>
          <div className="w-px h-6 bg-slate-300" />
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
              showTemplates ? 'bg-pink-100 text-pink-700' : 'bg-white/70 hover:bg-white text-slate-700'
            }`}
            title="テンプレートを展開"
          >
            <PanelTopOpen className="w-3.5 h-3.5" />
            テンプレ
          </button>
          <button
            onClick={() => setShowLayouts(!showLayouts)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
              showLayouts ? 'bg-blue-100 text-blue-700' : 'bg-white/70 hover:bg-white text-slate-700'
            }`}
            title="マスを自動整列"
          >
            <Rows3 className="w-3.5 h-3.5" />
            整列
          </button>
          <button
            onClick={addArea}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors"
            title="色付きのエリアを追加"
          >
            <MapIcon className="w-3.5 h-3.5" />
            エリア
          </button>
          <button
            onClick={() => fitView({ padding: 0.2, duration: 500 })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors"
            title="盤面全体を表示"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            全体表示
          </button>
          <div className="w-px h-6 bg-slate-300" />
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors"
            title="盤面をJSONファイルで保存"
          >
            <Download className="w-3.5 h-3.5" />
            エクスポート
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors"
            title="JSONファイルから盤面を読み込み"
          >
            <Upload className="w-3.5 h-3.5" />
            インポート
          </button>
          <div className="w-px h-6 bg-slate-300" />
          <button
            onClick={handleValidate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/70 hover:bg-white text-slate-700 transition-colors"
            title="盤面の問題をチェック"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            バリデーション
          </button>
          <div className="w-px h-6 bg-slate-300" />
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
              showSearch ? 'bg-purple-100 text-purple-700' : 'bg-white/70 hover:bg-white text-slate-700'
            }`}
            title="マスを名前で検索"
          >
            <Search className="w-3.5 h-3.5" />
            検索
          </button>
        </div>
      </div>

      {/* テンプレート展開 */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
          >
            <GlassCard className="w-[420px] p-4 shadow-xl">
              <h3 className="text-sm font-bold text-slate-800 mb-3">テンプレートを展開</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'simple', label: 'シンプル', icon: Rows3 },
                  { key: 'branch', label: '分岐ルート', icon: Workflow },
                  { key: 'long', label: 'ロング', icon: CircleDot },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      applyTemplate(item.key as 'simple' | 'branch' | 'long');
                      setShowTemplates(false);
                      setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 50);
                    }}
                    className="flex flex-col items-center gap-2 rounded-xl bg-white/70 p-3 text-xs font-bold text-slate-700 hover:bg-pink-50 hover:text-pink-700 transition-colors"
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">現在の盤面を置き換えます。戻すボタンで直前の状態へ戻せます。</p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

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
