import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useEditorStore } from '../store';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Play, RotateCcw, BarChart3, Clock, AlertTriangle, X, Info } from 'lucide-react';
import { movePlayer, rollDice, checkGoal } from '../../../services/gameEngine';

interface SimResult {
  totalGames: number;
  avgTurns: number;
  minTurns: number;
  maxTurns: number;
  nodeVisits: Record<string, number>;
  goalStats: Record<number, number>; // turns -> count
}

export const AISimulatorPanel = () => {
  const { nodes, edges, boardSettings } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SimResult | null>(null);

  useEffect(() => {
    const toggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-ai-simulator', toggle);
    return () => window.removeEventListener('toggle-ai-simulator', toggle);
  }, []);

  const runSimulation = async () => {
    setIsSimulating(true);
    setProgress(0);
    
    const numGames = 100;
    const nodeVisits: Record<string, number> = {};
    const goalTurns: number[] = [];
    
    // シミュレーション実行 (UIをフリーズさせないよう分割)
    for (let g = 0; g < numGames; g++) {
      if (g % 10 === 0) {
        setProgress(Math.round((g / numGames) * 100));
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      let turns = 0;
      let playerPos = 'start-node';
      const playerParams: Record<string, number> = {};
      boardSettings.parameters.forEach(p => playerParams[p.id] = p.initialValue);
      
      const maxTurns = 500; // 無限ループ防止
      while (turns < maxTurns) {
        turns++;
        
        // サイコロ
        const steps = rollDice(boardSettings.diceType);
        const moveResult = movePlayer(playerPos, steps, nodes, edges);
        
        // 移動途中のマスを記録
        moveResult.passedNodeIds.forEach(id => {
          nodeVisits[id] = (nodeVisits[id] || 0) + 1;
        });
        
        playerPos = moveResult.finalNodeId;
        nodeVisits[playerPos] = (nodeVisits[playerPos] || 0) + 1;

        // ゴール判定
        if (checkGoal(playerPos, nodes)) {
          goalTurns.push(turns);
          break;
        }

        // マスのアクション実行
        const node = nodes.find(n => n.id === playerPos);
        if (node?.data.actions) {
          // シミュレーション用の簡易処理（将来的に拡張可能）
        }
      }
    }

    const avg = goalTurns.length > 0 ? goalTurns.reduce((a, b) => a + b, 0) / goalTurns.length : 0;
    const min = goalTurns.length > 0 ? Math.min(...goalTurns) : 0;
    const max = goalTurns.length > 0 ? Math.max(...goalTurns) : 0;

    setResults({
      totalGames: numGames,
      avgTurns: Math.round(avg * 10) / 10,
      minTurns: min,
      maxTurns: max,
      nodeVisits,
      goalStats: goalTurns.reduce((acc, t) => {
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    });
    
    setIsSimulating(false);
    setProgress(100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        <GlassCard className="flex-grow flex flex-col p-0 overflow-hidden border-purple-200/50">
          {/* Header */}
          <div className="p-6 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-200">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 leading-none">AIシミュレーター</h2>
                <p className="text-xs text-slate-500 mt-1">100回のテストプレイを自動実行し、バランスを診断します</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-6 space-y-6">
            {!results && !isSimulating && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                  <BarChart3 className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">診断を開始してください</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">
                  マスの配置や分岐の確率が適切か、ゴールまで何ターンかかるかをAIが検証します。
                </p>
              </div>
            )}

            {isSimulating && (
              <div className="py-12 flex flex-col items-center">
                <div className="w-full max-w-xs h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm font-bold text-purple-600 animate-pulse">シミュレーション実行中... {progress}%</p>
              </div>
            )}

            {results && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">平均ターン数</span>
                  </div>
                  <div className="text-3xl font-black text-slate-800">{results.avgTurns} <span className="text-sm font-normal text-slate-500">turns</span></div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <Play className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">最短ターン</span>
                  </div>
                  <div className="text-3xl font-black text-slate-800">{results.minTurns}</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">最長ターン</span>
                  </div>
                  <div className="text-3xl font-black text-slate-800">{results.maxTurns}</div>
                </div>
              </div>
            )}

            {results && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-500" />
                  診断レポート
                </h4>
                <div className="p-4 bg-white border border-slate-100 rounded-2xl text-sm text-slate-600 leading-relaxed shadow-sm">
                  {results.avgTurns < 10 && "🏁 コースが少し短すぎるようです。もっとマスを増やすか、戻るギミックを追加するといいかもしれません。"}
                  {results.avgTurns > 50 && "⏳ 1ゲームが長すぎる可能性があります。ワープや移動距離の大きいプラスマスを増やしてみてください。"}
                  {results.maxTurns > 200 && "⚠️ 抜け出せないループが発生している可能性があります。戻るマスの先を再確認してください。"}
                  {results.avgTurns >= 10 && results.avgTurns <= 50 && "✨ 非常にバランスの良い構成です！適度なプレイ時間で楽しめそうです。"}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 flex items-center justify-center gap-4">
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 transition-all disabled:opacity-50"
            >
              {results ? <RotateCcw className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {results ? '再診断する' : '診断を開始する'}
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
