import { useState } from 'react';
import { useEditorStore } from '../store';
import type {
  Action, ActionType, ParamChangeAction, MoveNAction, BackNAction,
  RestAction, WarpAction, ConditionBranchAction, RandomBranchAction,
  StealAction, MinigameAction, DiceParamAction,
} from '../../../types/board';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const actionLabels: Record<ActionType, string> = {
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

interface ActionEditorItemProps {
  action: Action;
  index: number;
  onUpdate: (updated: Action) => void;
  onRemove: () => void;
}

// 個別のアクション編集UI
const ActionEditorItem = ({ action, onUpdate, onRemove }: ActionEditorItemProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const { boardSettings, nodes } = useEditorStore();

  return (
    <div className="border border-slate-200 rounded-xl bg-white/70 overflow-hidden">
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm font-medium flex-1">{actionLabels[action.type]}</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {isOpen && (
        <div className="p-3 pt-0 space-y-2 border-t border-slate-100">
          {action.type === 'paramChange' && (
            <>
              <select
                className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                value={(action as ParamChangeAction).paramId}
                onChange={(e) => onUpdate({ ...action, paramId: e.target.value } as ParamChangeAction)}
              >
                {boardSettings.parameters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 w-12">増減値</label>
                <input
                  type="number"
                  className="flex-1 p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                  value={(action as ParamChangeAction).amount}
                  onChange={(e) => onUpdate({ ...action, amount: Number(e.target.value) } as ParamChangeAction)}
                />
              </div>
            </>
          )}

          {action.type === 'moveN' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 w-12">マス数</label>
              <input
                type="number" min={1}
                className="flex-1 p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                value={(action as MoveNAction).amount}
                onChange={(e) => onUpdate({ ...action, amount: Number(e.target.value) } as MoveNAction)}
              />
            </div>
          )}

          {action.type === 'backN' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 w-12">マス数</label>
              <input
                type="number" min={1}
                className="flex-1 p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                value={(action as BackNAction).amount}
                onChange={(e) => onUpdate({ ...action, amount: Number(e.target.value) } as BackNAction)}
              />
            </div>
          )}

          {action.type === 'rest' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 w-16">休みターン</label>
              <input
                type="number" min={1}
                className="flex-1 p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                value={(action as RestAction).turns}
                onChange={(e) => onUpdate({ ...action, turns: Number(e.target.value) } as RestAction)}
              />
            </div>
          )}

          {action.type === 'diceParam' && (
            <>
              <select
                className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                value={(action as DiceParamAction).paramId}
                onChange={(e) => onUpdate({ ...action, paramId: e.target.value } as DiceParamAction)}
              >
                {boardSettings.parameters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 w-12">倍率</label>
                <input
                  type="number"
                  className="flex-1 p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                  value={(action as DiceParamAction).multiplier}
                  onChange={(e) => onUpdate({ ...action, multiplier: Number(e.target.value) } as DiceParamAction)}
                />
              </div>
            </>
          )}

          {action.type === 'warp' && (
            <select
              className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
              value={(action as WarpAction).targetNodeId}
              onChange={(e) => onUpdate({ ...action, targetNodeId: e.target.value } as WarpAction)}
            >
              <option value="">ワープ先を選択...</option>
              {nodes.map(n => <option key={n.id} value={n.id}>{n.data.label} ({n.id})</option>)}
            </select>
          )}

          {action.type === 'conditionBranch' && (
            <>
              <select
                className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                value={(action as ConditionBranchAction).paramId}
                onChange={(e) => onUpdate({ ...action, paramId: e.target.value } as ConditionBranchAction)}
              >
                {boardSettings.parameters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <select
                  className="w-20 p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                  value={(action as ConditionBranchAction).operator}
                  onChange={(e) => onUpdate({ ...action, operator: e.target.value } as any)}
                >
                  <option value=">">{'>'}</option>
                  <option value=">=">{'>='}</option>
                  <option value="==">{'=='}</option>
                  <option value="<=">{'<='}</option>
                  <option value="<">{'<'}</option>
                </select>
                <input
                  type="number"
                  className="flex-1 p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                  value={(action as ConditionBranchAction).value}
                  onChange={(e) => onUpdate({ ...action, value: Number(e.target.value) } as ConditionBranchAction)}
                />
              </div>
            </>
          )}

          {action.type === 'randomBranch' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 w-12">確率(%)</label>
              <input
                type="number" min={0} max={100}
                className="flex-1 p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                value={(action as RandomBranchAction).probability}
                onChange={(e) => onUpdate({ ...action, probability: Number(e.target.value) } as RandomBranchAction)}
              />
            </div>
          )}

          {action.type === 'steal' && (
            <>
              <select
                className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                value={(action as StealAction).target}
                onChange={(e) => onUpdate({ ...action, target: e.target.value } as any)}
              >
                <option value="random">ランダム</option>
                <option value="select">選択</option>
              </select>
              <select
                className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                value={(action as StealAction).paramId}
                onChange={(e) => onUpdate({ ...action, paramId: e.target.value } as StealAction)}
              >
                {boardSettings.parameters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 w-12">奪う量</label>
                <input
                  type="number" min={0}
                  className="flex-1 p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                  value={(action as StealAction).amount}
                  onChange={(e) => onUpdate({ ...action, amount: Number(e.target.value) } as StealAction)}
                />
              </div>
            </>
          )}

          {action.type === 'minigame' && (
            <select
              className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
              value={(action as MinigameAction).gameType}
              onChange={(e) => onUpdate({ ...action, gameType: e.target.value } as any)}
            >
              <option value="janken">じゃんけん</option>
              <option value="highlow">ハイ＆ロー</option>
              <option value="chouhan">丁半</option>
            </select>
          )}

          {(action.type === 'diceMove' || action.type === 'goalBonus') && (
            <p className="text-xs text-slate-400 italic">追加設定はありません</p>
          )}
        </div>
      )}
    </div>
  );
};

// アクション追加時のデフォルト値
function createDefaultAction(type: ActionType): Action {
  const paramId = 'money';
  switch (type) {
    case 'paramChange': return { type, paramId, amount: 100 };
    case 'moveN': return { type, amount: 2 };
    case 'backN': return { type, amount: 2 };
    case 'rest': return { type, turns: 1 };
    case 'diceMove': return { type };
    case 'diceParam': return { type, paramId, multiplier: 100 };
    case 'goalBonus': return { type };
    case 'warp': return { type, targetNodeId: '' };
    case 'conditionBranch': return { type, paramId, operator: '>=', value: 500 };
    case 'randomBranch': return { type, probability: 50 };
    case 'steal': return { type, target: 'random', paramId, amount: 100 };
    case 'minigame': return { type, gameType: 'janken', winActions: [], loseActions: [] };
    default: return { type: 'paramChange', paramId, amount: 0 };
  }
}

// メインのアクションエディタ
interface ActionEditorProps {
  nodeId: string;
  actions: Action[];
}

export const ActionEditor = ({ nodeId, actions }: ActionEditorProps) => {
  const { updateNodeData } = useEditorStore();
  const [showPicker, setShowPicker] = useState(false);

  const handleAdd = (type: ActionType) => {
    const newAction = createDefaultAction(type);
    updateNodeData(nodeId, { actions: [...actions, newAction] });
    setShowPicker(false);
  };

  const handleUpdate = (index: number, updated: Action) => {
    const newActions = [...actions];
    newActions[index] = updated;
    updateNodeData(nodeId, { actions: newActions });
  };

  const handleRemove = (index: number) => {
    updateNodeData(nodeId, { actions: actions.filter((_, i) => i !== index) });
  };

  return (
    <div className="pt-4 border-t border-slate-200/50 mt-4">
      <h3 className="text-sm font-bold text-slate-800 mb-3">⚡ アクション設定</h3>

      {actions.length > 0 && (
        <div className="space-y-2 mb-3">
          {actions.map((action, idx) => (
            <ActionEditorItem
              key={idx}
              action={action}
              index={idx}
              onUpdate={(updated) => handleUpdate(idx, updated)}
              onRemove={() => handleRemove(idx)}
            />
          ))}
        </div>
      )}

      {showPicker ? (
        <div className="space-y-1 p-2 border border-slate-200 rounded-xl bg-white/80 max-h-48 overflow-y-auto">
          {(Object.keys(actionLabels) as ActionType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleAdd(type)}
              className="w-full text-left p-2 text-xs rounded-lg hover:bg-purple-50 transition-colors text-slate-700"
            >
              {actionLabels[type]}
            </button>
          ))}
          <button
            onClick={() => setShowPicker(false)}
            className="w-full text-center p-1 text-xs text-slate-400 hover:text-slate-600"
          >
            キャンセル
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors text-sm"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          アクションを追加
        </button>
      )}
    </div>
  );
};
