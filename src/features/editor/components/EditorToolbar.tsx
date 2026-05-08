import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorStore } from '../store';
import { Download, Upload, CheckCircle, AlertTriangle, Search, X } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';

interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

function validateBoard(nodes: any[], edges: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // スタートマスのチェック
  const startNodes = nodes.filter(n => n.data.nodeType === 'start');
  if (startNodes.length === 0) errors.push('スタートマスが配置されていません');
  if (startNodes.length > 1) warnings.push(`スタートマスが${startNodes.length}個あります（通常は1つ）`);

  // ゴールマスのチェック
  const goalNodes = nodes.filter(n => n.data.nodeType === 'goal');
  if (goalNodes.length === 0) errors.push('ゴールマスが配置されていません');

  // 孤立ノードのチェック
  const connectedNodeIds = new Set<string>();
  edges.forEach((e: any) => { connectedNodeIds.add(e.source); connectedNodeIds.add(e.target); });
  const isolated = nodes.filter((n: any) => !connectedNodeIds.has(n.id) && nodes.length > 1);
  if (isolated.length > 0) {
    warnings.push(`${isolated.length}個のマスがどこにも繋がっていません: ${isolated.map((n: any) => n.data.label).join(', ')}`);
  }

  // ラベルなしノードのチェック
  const unnamed = nodes.filter((n: any) => !n.data.label || n.data.label.trim() === '');
  if (unnamed.length > 0) warnings.push(`${unnamed.length}個のマスにラベルが未設定です`);

  return { ok: errors.length === 0, errors, warnings };
}

export const EditorToolbar = () => {
  const { nodes, edges, boardSettings } = useEditorStore();
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // JSONエクスポート
  const handleExport = () => {
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
        if (data.nodes && data.edges) {
          // storeを直接更新
          const store = useEditorStore.getState();
          store.resetStore();
          // 少し遅延を入れてからセット
          setTimeout(() => {
            useEditorStore.setState({
              nodes: data.nodes,
              edges: data.edges,
              boardSettings: data.settings || store.boardSettings,
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
