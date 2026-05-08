import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { NodeData, Action } from '../../../types/board';
import { X } from 'lucide-react';

interface NodeDetailPanelProps {
  nodeData: NodeData;
  onClose: () => void;
}

const actionLabels: Record<string, string> = {
  paramChange: '💰 パラメータ増減',
  moveN: '➡️ Nマス進む',
  backN: '⬅️ Nマス戻る',
  rest: '😴 1回休み',
  diceMove: '🎲 サイコロで移動',
  diceParam: '🎲 サイコロでパラメータ',
  goalBonus: '🏆 ゴール順位ボーナス',
  warp: '✨ ワープ',
  conditionBranch: '🔀 条件分岐',
  randomBranch: '🎰 ランダム分岐',
  steal: '💰 プレイヤー干渉（奪う）',
  minigame: '🎮 ミニゲーム',
};

function describeAction(action: Action): string {
  switch (action.type) {
    case 'paramChange': return `${action.paramId} を ${action.amount > 0 ? '+' : ''}${action.amount}`;
    case 'moveN': return `${action.amount}マス進む`;
    case 'backN': return `${action.amount}マス戻る`;
    case 'rest': return `${action.turns}ターン休み`;
    case 'diceMove': return 'サイコロの出目だけ進む';
    case 'diceParam': return `${action.paramId} × ${action.multiplier}`;
    case 'goalBonus': return 'ゴール順位に応じたボーナス';
    case 'warp': return `${action.targetNodeId} へワープ`;
    case 'conditionBranch': return `${action.paramId} ${action.operator} ${action.value}`;
    case 'randomBranch': return `${action.probability}% の確率で成功`;
    case 'steal': return `${action.target === 'random' ? 'ランダム' : '選択'} から ${action.amount} 奪う`;
    case 'minigame': return `${action.gameType === 'janken' ? 'じゃんけん' : action.gameType === 'highlow' ? 'ハイ＆ロー' : '丁半'}`;
    default: return '';
  }
}

const panelVariants: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
  exit: { opacity: 0, x: 30 },
};

export const NodeDetailPanel = ({ nodeData, onClose }: NodeDetailPanelProps) => {
  return (
    <motion.div
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute right-4 top-1/2 -translate-y-1/2 z-30 pointer-events-auto"
    >
      <GlassCard className="w-72 p-5 shadow-2xl">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-slate-800">{nodeData.label}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {nodeData.description && (
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">{nodeData.description}</p>
        )}

        {nodeData.image && (
          <img src={nodeData.image as string} alt="" className="w-full h-24 object-cover rounded-lg mb-4" />
        )}

        {nodeData.actions && nodeData.actions.length > 0 ? (
          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-2">⚡ このマスのイベント</h4>
            <div className="space-y-2">
              {nodeData.actions.map((action, idx) => (
                <div key={idx} className="p-2 bg-white/60 rounded-lg">
                  <p className="text-xs font-bold text-purple-700">{actionLabels[action.type]}</p>
                  <p className="text-[11px] text-slate-600">{describeAction(action)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">イベントは設定されていません</p>
        )}

        {/* マス上のプレイヤー */}
        {nodeData.playersOnNode && nodeData.playersOnNode.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200/50">
            <h4 className="text-xs font-bold text-slate-500 mb-2">👥 このマスにいるプレイヤー</h4>
            <div className="flex gap-2 flex-wrap">
              {nodeData.playersOnNode.map(p => (
                <span key={p.id} className="text-sm bg-white/70 px-2 py-1 rounded-lg">
                  {p.icon} {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};
