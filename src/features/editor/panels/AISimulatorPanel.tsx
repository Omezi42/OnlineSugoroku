import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorStore } from '../store';
import { GlassCard } from '../../../components/ui/GlassCard';
import { RotateCcw, BarChart3, Clock, AlertTriangle, X, Info, Activity, Flag } from 'lucide-react';
import { movePlayer, rollDice, checkGoal } from '../../../services/gameEngine';
import { cn } from '../../../lib/cn';

interface SimResult {
  totalGames: number;
  avgTurns: number;
  minTurns: number;
  maxTurns: number;
  nodeVisits: Record<string, number>;
  successRate: number;
  issues: string[];
}

export const AISimulatorPanel = () => {
  const { nodes, edges, boardSettings } = useEditorStore();
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SimResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-ai-simulator', handleToggle);
    return () => window.removeEventListener('toggle-ai-simulator', handleToggle);
  }, []);

  const runSimulation = async () => {
    setIsSimulating(true);
    setProgress(0);
    setResults(null);

    const numGames = 100;
    const nodeVisits: Record<string, number> = {};
    const goalTurns: number[] = [];
    const issues = new Set<string>();
    
    const startNode = nodes.find(n => n.data.nodeType === 'start');
    if (!startNode) {
      setIsSimulating(false);
      alert('スタート地点が見つかりません。盤面にスタートマスを配置してください。');
      return;
    }

    for (let g = 0; g < numGames; g++) {
      if (g % 10 === 0) {
        setProgress(Math.round((g / numGames) * 100));
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      let turns = 0;
      let playerPos = startNode.id;
      const playerParams: Record<string, number> = {};
      boardSettings.parameters.forEach(p => playerParams[p.id] = p.initialValue);
      
      const maxTurns = 300;
      let lastPos = '';
      let samePosCount = 0;

      while (turns < maxTurns) {
        turns++;
        
        // サイコロと移動
        const steps = rollDice(boardSettings.diceType);
        let moveResult = movePlayer(playerPos, steps, nodes, edges);
        
        // 分岐の自動選択 (パラメータ考慮)
        while (moveResult.needsBranchChoice && moveResult.branchOptions) {
          let chosenTarget = '';
          const node = nodes.find(n => n.id === playerPos);
          
          // 条件分岐アクションがあるか確認
          const condAction = node?.data.actions?.find(a => a.type === 'conditionBranch');
          if (condAction && condAction.paramId) {
            const val = playerParams[condAction.paramId] || 0;
            const threshold = condAction.value || 0;
            let conditionMet = false;
            if (condAction.operator === '>=') conditionMet = val >= threshold;
            else if (condAction.operator === '<=') conditionMet = val <= threshold;
            else if (condAction.operator === '>') conditionMet = val > threshold;
            else if (condAction.operator === '<') conditionMet = val < threshold;
            else conditionMet = val === threshold;

            const edgeId = conditionMet ? condAction.trueEdgeId : condAction.falseEdgeId;
            const option = moveResult.branchOptions.find(o => o.edgeId === edgeId);
            if (option) chosenTarget = option.targetNodeId;
          }

          // 確率分岐
          const probAction = node?.data.actions?.find(a => a.type === 'randomBranch');
          if (!chosenTarget && probAction) {
            const isSuccess = Math.random() * 100 < (probAction.probability || 50);
            const edgeId = isSuccess ? probAction.successEdgeId : probAction.failureEdgeId;
            const option = moveResult.branchOptions.find(o => o.edgeId === edgeId);
            if (option) chosenTarget = option.targetNodeId;
          }

          // それ以外はランダム
          if (!chosenTarget && moveResult.branchOptions.length > 0) {
            chosenTarget = moveResult.branchOptions[Math.floor(Math.random() * moveResult.branchOptions.length)].targetNodeId;
          }

          if (!chosenTarget) break;

          moveResult.passedNodeIds.forEach(id => {
            nodeVisits[id] = (nodeVisits[id] || 0) + 1;
          });
          
          playerPos = chosenTarget;
          nodeVisits[playerPos] = (nodeVisits[playerPos] || 0) + 1;
          
          if (moveResult.remainingSteps > 0) {
            moveResult = movePlayer(playerPos, moveResult.remainingSteps, nodes, edges);
          } else {
            break;
          }
        }
        
        moveResult.passedNodeIds.forEach(id => {
          nodeVisits[id] = (nodeVisits[id] || 0) + 1;
        });
        
        playerPos = moveResult.finalNodeId;
        nodeVisits[playerPos] = (nodeVisits[playerPos] || 0) + 1;

        if (checkGoal(playerPos, nodes)) {
          goalTurns.push(turns);
          break;
        }

        // アクション実行
        const node = nodes.find(n => n.id === playerPos);
        if (node?.data.actions) {
          for (const action of node.data.actions) {
            if (action.type === 'paramChange' && action.paramId) {
              playerParams[action.paramId] = (playerParams[action.paramId] || 0) + (action.amount || 0);
            } else if (action.type === 'warp' && action.targetNodeId) {
              playerPos = action.targetNodeId;
              nodeVisits[playerPos] = (nodeVisits[playerPos] || 0) + 1;
            } else if ((action.type === 'moveN' || action.type === 'backN') && action.amount) {
              const dist = action.type === 'moveN' ? action.amount : -action.amount;
              const res = movePlayer(playerPos, dist, nodes, edges);
              playerPos = res.finalNodeId;
              nodeVisits[playerPos] = (nodeVisits[playerPos] || 0) + 1;
            }
          }
          if (checkGoal(playerPos, nodes)) {
            goalTurns.push(turns);
            break;
          }
        }

        // デッドロック検知
        if (playerPos === lastPos) {
          samePosCount++;
          if (samePosCount > 20) {
            issues.add(`${node?.data.label || playerPos} 付近でAIがスタックしています。`);
            break;
          }
        } else {
          lastPos = playerPos;
          samePosCount = 0;
        }
      }
    }

    const avg = goalTurns.length > 0 ? goalTurns.reduce((a, b) => a + b, 0) / goalTurns.length : 0;
    setResults({
      totalGames: numGames,
      avgTurns: Math.round(avg * 10) / 10,
      minTurns: goalTurns.length > 0 ? Math.min(...goalTurns) : 0,
      maxTurns: goalTurns.length > 0 ? Math.max(...goalTurns) : 0,
      nodeVisits,
      successRate: Math.round((goalTurns.length / numGames) * 100),
      issues: Array.from(issues)
    });
    setIsSimulating(false);
    setProgress(100);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] z-[100] p-4">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full"
        >
          <GlassCard className="overflow-hidden border-white/40 shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-white/20 bg-white/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">AIバランス診断</h3>
                  <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">
                    Advanced Simulation V2
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {!results && !isSimulating && (
                <div className="text-center space-y-6 py-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <Activity className="w-8 h-8 text-indigo-400 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 font-medium">
                      AIが100回テストプレイを実行します。
                    </p>
                    <p className="text-xs text-slate-400 px-8">
                      分岐、ワープ、パラメータ変化を全て計算し、ゴール到達率や平均ターンを算出します。
                    </p>
                  </div>
                  <button
                    onClick={runSimulation}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    診断を開始する
                  </button>
                </div>
              )}

              {isSimulating && (
                <div className="space-y-6 py-8">
                  <div className="flex justify-between items-end mb-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Games...</div>
                    <div className="text-3xl font-black text-indigo-600">{progress}%</div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-slate-400 italic">
                    AIが最適な戦略と確率を計算中...
                  </p>
                </div>
              )}

              {results && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-white/60 text-center">
                      <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center justify-center gap-1 uppercase">
                        <Flag className="w-3 h-3" /> 到達率
                      </div>
                      <div className={cn("text-3xl font-black", results.successRate > 80 ? "text-emerald-500" : "text-rose-500")}>
                        {results.successRate}%
                      </div>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-white/60 text-center">
                      <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center justify-center gap-1 uppercase">
                        <Clock className="w-3 h-3" /> 平均ターン
                      </div>
                      <div className="text-3xl font-black text-indigo-600">{results.avgTurns}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-white/60 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">最短記録</span>
                      <span className="text-lg font-black text-emerald-600">{results.minTurns}</span>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-white/60 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">最長記録</span>
                      <span className="text-lg font-black text-rose-600">{results.maxTurns}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Info className="w-4 h-4 text-indigo-500" />
                      AI Diagnosis Report
                    </h4>
                    <div className="space-y-2">
                      <div className="p-5 bg-white border border-slate-100 rounded-3xl text-sm text-slate-600 leading-relaxed shadow-sm">
                        {results.successRate < 100 && (
                          <div className="flex gap-2 text-rose-500 font-bold mb-3 pb-3 border-b border-rose-50">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <span>AIが100%ゴールできませんでした。</span>
                          </div>
                        )}
                        {results.avgTurns < 10 && "🏁 コースが非常に短いです。テンポは良いですが、やりごたえを出すにはもう少しマスを増やすのがおすすめです。"}
                        {results.avgTurns > 60 && "⏳ 1ゲームのプレイ時間が長くなりすぎる可能性があります。ショートカットマスを増やすか、戻るマスを減らしてみてください。"}
                        {results.successRate >= 90 && results.avgTurns >= 10 && results.avgTurns <= 60 && "✨ 非常にバランスの良い構成です！プレイヤーが満足できるプレイボリュームと難易度です。"}
                      </div>
                      
                      {results.issues.length > 0 && (
                        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                          <ul className="space-y-2">
                            {results.issues.map((issue, i) => (
                              <li key={i} className="text-xs text-rose-600 flex gap-2">
                                <span className="font-bold">•</span>
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {results && (
              <div className="p-6 bg-slate-50/50 border-t border-white/20">
                <button
                  onClick={runSimulation}
                  className="w-full py-4 bg-white text-slate-600 font-black rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  RE-DIAGNOSE
                </button>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
