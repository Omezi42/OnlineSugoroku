import { useState } from 'react';
import { useEditorStore } from '../store';
import type {
  Action, ActionType, ParamChangeAction, MoveNAction, BackNAction,
  RestAction, WarpAction, ConditionBranchAction, RandomBranchAction,
  StealAction, MinigameAction, DiceParamAction, RouletteAction, CardAction, Operator,
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
  roulette: '🎡 ルーレット',
  card: '🃏 カードドロー',
};

// サブアクション（ミニゲームの勝利時・敗北時など）を編集するためのコンポーネント
const SubActionEditor = ({ 
  actions, 
  onUpdate, 
  label
}: { 
  actions: Action[], 
  onUpdate: (actions: Action[]) => void, 
  label: string
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleAdd = (type: ActionType) => {
    const newAction = createDefaultAction(type);
    onUpdate([...actions, newAction]);
    setShowPicker(false);
  };

  const handleItemUpdate = (index: number, updated: Action) => {
    const newActions = [...actions];
    newActions[index] = updated;
    onUpdate(newActions);
  };

  const handleRemove = (index: number) => {
    onUpdate(actions.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-2 pl-3 border-l-2 border-purple-200 space-y-2">
      <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">{label}</div>
      {actions.map((action, idx) => (
        <ActionEditorItem
          key={idx}
          action={action}
          index={idx}
          onUpdate={(updated) => handleItemUpdate(idx, updated)}
          onRemove={() => handleRemove(idx)}
        />
      ))}
      
      {showPicker ? (
        <div className="space-y-1 p-2 border border-purple-100 rounded-lg bg-purple-50/50">
          {(Object.keys(actionLabels) as ActionType[]).filter(t => t !== 'minigame').map((type) => (
            <button
              key={type}
              onClick={() => handleAdd(type)}
              className="w-full text-left p-1.5 text-[10px] rounded hover:bg-white transition-colors text-slate-700"
            >
              {actionLabels[type]}
            </button>
          ))}
          <button onClick={() => setShowPicker(false)} className="w-full text-center p-1 text-[10px] text-slate-400">
            キャンセル
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-1.5 border border-dashed border-purple-200 text-purple-500 rounded-lg text-[10px] font-medium hover:bg-purple-50"
        >
          + {label}アクションを追加
        </button>
      )}
    </div>
  );
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
  const { boardSettings, nodes, edges } = useEditorStore();
  const currentNode = nodes.find((node) => node.data.actions?.some(a => JSON.stringify(a) === JSON.stringify(action)));
  const outgoingEdges = currentNode ? edges.filter((edge) => edge.source === currentNode.id) : [];
  const edgeLabel = (edgeId: string) => {
    const edge = edges.find((item) => item.id === edgeId);
    if (!edge) return edgeId;
    if (edge.label) return `${edge.label} (${edgeId.substring(0, 4)})`;
    const target = nodes.find((node) => node.id === edge.target);
    return target?.data.label || `接続先: ${edge.target.substring(0, 4)}...`;
  };

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
            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-bold block mb-1">ワープ先のマス</label>
              <select
                className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                value={(action as WarpAction).targetNodeId}
                onChange={(e) => onUpdate({ ...action, targetNodeId: e.target.value } as WarpAction)}
              >
                <option value="">ワープ先を選択...</option>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.data.label || '無名'} (ID: {n.id.substring(0, 4)}...)</option>)}
              </select>
            </div>
          )}

          {action.type === 'conditionBranch' && (
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-bold">判定するパラメータと条件</label>
                <select
                  className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                  value={(action as ConditionBranchAction).paramId}
                  onChange={(e) => onUpdate({ ...action, paramId: e.target.value } as ConditionBranchAction)}
                >
                  {boardSettings.parameters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="w-20 p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                  value={(action as ConditionBranchAction).operator}
                  onChange={(e) => onUpdate({ ...action, operator: e.target.value as Operator } as ConditionBranchAction)}
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
              <p className="text-xs text-slate-500 bg-blue-50 p-2 rounded leading-relaxed">
                このマスから出ている線を条件成立時/不成立時のルートとして指定できます。
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 font-bold block mb-1">成立時の線</label>
                  <select
                    className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                    value={(action as ConditionBranchAction).trueEdgeId || ''}
                    onChange={(e) => onUpdate({ ...action, trueEdgeId: e.target.value } as ConditionBranchAction)}
                  >
                    <option value="">未指定</option>
                    {outgoingEdges.map(edge => <option key={edge.id} value={edge.id}>{edgeLabel(edge.id)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold block mb-1">不成立時の線</label>
                  <select
                    className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                    value={(action as ConditionBranchAction).falseEdgeId || ''}
                    onChange={(e) => onUpdate({ ...action, falseEdgeId: e.target.value } as ConditionBranchAction)}
                  >
                    <option value="">未指定</option>
                    {outgoingEdges.map(edge => <option key={edge.id} value={edge.id}>{edgeLabel(edge.id)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {action.type === 'randomBranch' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 w-12">確率(%)</label>
                <input
                  type="number" min={0} max={100}
                  className="flex-1 p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                  value={(action as RandomBranchAction).probability}
                  onChange={(e) => onUpdate({ ...action, probability: Number(e.target.value) } as RandomBranchAction)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 font-bold block mb-1">成功時の線</label>
                  <select
                    className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                    value={(action as RandomBranchAction).successEdgeId || ''}
                    onChange={(e) => onUpdate({ ...action, successEdgeId: e.target.value } as RandomBranchAction)}
                  >
                    <option value="">未指定</option>
                    {outgoingEdges.map(edge => <option key={edge.id} value={edge.id}>{edgeLabel(edge.id)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold block mb-1">失敗時の線</label>
                  <select
                    className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                    value={(action as RandomBranchAction).failureEdgeId || ''}
                    onChange={(e) => onUpdate({ ...action, failureEdgeId: e.target.value } as RandomBranchAction)}
                  >
                    <option value="">未指定</option>
                    {outgoingEdges.map(edge => <option key={edge.id} value={edge.id}>{edgeLabel(edge.id)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {action.type === 'steal' && (
            <>
              <select
                className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                value={(action as StealAction).target}
                onChange={(e) => onUpdate({ ...action, target: e.target.value as StealAction['target'] } as StealAction)}
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
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 font-bold block mb-1">ゲームの種類</label>
                <select
                  className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                  value={(action as MinigameAction).gameType}
                  onChange={(e) => onUpdate({ ...action, gameType: e.target.value as MinigameAction['gameType'] } as MinigameAction)}
                >
                  <option value="janken">じゃんけん</option>
                  <option value="highlow">ハイ＆ロー</option>
                  <option value="chouhan">丁半</option>
                  <option value="mashing">連打勝負</option>
                  <option value="timing">タイミングゲージ</option>
                </select>
              </div>

              <div className="space-y-2 p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                <label className="text-xs text-slate-500 font-bold block">分岐設定（勝利時/敗北時）</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-green-600 font-bold block mb-1">勝利時に進む線</label>
                    <select
                      className="w-full p-1.5 text-[10px] rounded-lg border border-slate-200 bg-white"
                      value={(action as MinigameAction).winEdgeId || ''}
                      onChange={(e) => onUpdate({ ...action, winEdgeId: e.target.value } as MinigameAction)}
                    >
                      <option value="">未指定</option>
                      {outgoingEdges.map(edge => <option key={edge.id} value={edge.id}>{edgeLabel(edge.id)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-red-600 font-bold block mb-1">敗北時に進む線</label>
                    <select
                      className="w-full p-1.5 text-[10px] rounded-lg border border-slate-200 bg-white"
                      value={(action as MinigameAction).loseEdgeId || ''}
                      onChange={(e) => onUpdate({ ...action, loseEdgeId: e.target.value } as MinigameAction)}
                    >
                      <option value="">未指定</option>
                      {outgoingEdges.map(edge => <option key={edge.id} value={edge.id}>{edgeLabel(edge.id)}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <SubActionEditor
                label="勝利時"
                actions={(action as MinigameAction).winActions || []}
                onUpdate={(winActions) => onUpdate({ ...action, winActions } as MinigameAction)}
              />
              <SubActionEditor
                label="敗北時"
                actions={(action as MinigameAction).loseActions || []}
                onUpdate={(loseActions) => onUpdate({ ...action, loseActions } as MinigameAction)}
              />
            </div>
          )}

          {action.type === 'roulette' && (
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-bold">ルーレットのタイトル</label>
                <input
                  type="text"
                  className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                  value={(action as RouletteAction).title}
                  onChange={(e) => onUpdate({ ...action, title: e.target.value } as RouletteAction)}
                  placeholder="何が出るかな？"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-bold">選択肢設定</label>
                {(action as RouletteAction).choices.map((choice, cIdx) => (
                  <div key={choice.id} className="p-2 border border-slate-100 rounded-lg bg-slate-50/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="w-8 h-8 rounded border-none p-0 cursor-pointer"
                        value={choice.color}
                        onChange={(e) => {
                          const newChoices = [...(action as RouletteAction).choices];
                          newChoices[cIdx] = { ...choice, color: e.target.value };
                          onUpdate({ ...action, choices: newChoices } as RouletteAction);
                        }}
                      />
                      <input
                        type="text"
                        className="flex-1 p-1 text-xs rounded border border-slate-200"
                        value={choice.label}
                        onChange={(e) => {
                          const newChoices = [...(action as RouletteAction).choices];
                          newChoices[cIdx] = { ...choice, label: e.target.value };
                          onUpdate({ ...action, choices: newChoices } as RouletteAction);
                        }}
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">重み</span>
                        <input
                          type="number"
                          className="w-10 p-1 text-xs rounded border border-slate-200"
                          value={choice.weight}
                          onChange={(e) => {
                            const newChoices = [...(action as RouletteAction).choices];
                            newChoices[cIdx] = { ...choice, weight: Number(e.target.value) };
                            onUpdate({ ...action, choices: newChoices } as RouletteAction);
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newChoices = (action as RouletteAction).choices.filter((_, i) => i !== cIdx);
                          onUpdate({ ...action, choices: newChoices } as RouletteAction);
                        }}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <SubActionEditor
                      label="当選時の効果"
                      actions={choice.actions || []}
                      onUpdate={(subActions) => {
                        const newChoices = [...(action as RouletteAction).choices];
                        newChoices[cIdx] = { ...choice, actions: subActions };
                        onUpdate({ ...action, choices: newChoices } as RouletteAction);
                      }}
                    />
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newChoice = { id: `choice-${Date.now()}`, label: '新しい項目', color: '#6366f1', weight: 1, actions: [] };
                    onUpdate({ ...action, choices: [...(action as RouletteAction).choices, newChoice] } as RouletteAction);
                  }}
                  className="w-full py-1 border border-dashed border-slate-300 text-slate-500 rounded text-[10px] hover:bg-slate-50"
                >
                  + 選択肢を追加
                </button>
              </div>
            </div>
          )}

          {action.type === 'card' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500 font-bold">タイトル</label>
                  <input
                    type="text"
                    className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                    value={(action as CardAction).title}
                    onChange={(e) => onUpdate({ ...action, title: e.target.value } as CardAction)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500 font-bold">デッキ名</label>
                  <input
                    type="text"
                    className="w-full p-1.5 text-sm rounded-lg border border-slate-200 bg-white/50"
                    value={(action as CardAction).deckName}
                    onChange={(e) => onUpdate({ ...action, deckName: e.target.value } as CardAction)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-bold">カードリスト</label>
                {(action as CardAction).cards.map((card, cIdx) => (
                  <div key={card.id} className="p-2 border border-slate-100 rounded-lg bg-slate-50/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="w-6 h-6 rounded border-none p-0 cursor-pointer"
                        value={card.color}
                        onChange={(e) => {
                          const newCards = [...(action as CardAction).cards];
                          newCards[cIdx] = { ...card, color: e.target.value };
                          onUpdate({ ...action, cards: newCards } as CardAction);
                        }}
                      />
                      <input
                        type="text"
                        className="flex-1 p-1 text-xs font-bold rounded border border-slate-200"
                        value={card.title}
                        onChange={(e) => {
                          const newCards = [...(action as CardAction).cards];
                          newCards[cIdx] = { ...card, title: e.target.value };
                          onUpdate({ ...action, cards: newCards } as CardAction);
                        }}
                        placeholder="カード名"
                      />
                      <button 
                        onClick={() => {
                          const newCards = (action as CardAction).cards.filter((_, i) => i !== cIdx);
                          onUpdate({ ...action, cards: newCards } as CardAction);
                        }}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <textarea
                      className="w-full p-1 text-[10px] rounded border border-slate-200 h-12"
                      value={card.description}
                      onChange={(e) => {
                        const newCards = [...(action as CardAction).cards];
                        newCards[cIdx] = { ...card, description: e.target.value };
                        onUpdate({ ...action, cards: newCards } as CardAction);
                      }}
                      placeholder="カードの説明文..."
                    />
                    <SubActionEditor
                      label="使用時の効果"
                      actions={card.actions || []}
                      onUpdate={(subActions) => {
                        const newCards = [...(action as CardAction).cards];
                        newCards[cIdx] = { ...card, actions: subActions };
                        onUpdate({ ...action, cards: newCards } as CardAction);
                      }}
                    />
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newCard = { id: `card-${Date.now()}`, title: '新しいカード', description: '説明を入力...', color: '#3b82f6', actions: [] };
                    onUpdate({ ...action, cards: [...(action as CardAction).cards, newCard] } as CardAction);
                  }}
                  className="w-full py-1 border border-dashed border-slate-300 text-slate-500 rounded text-[10px] hover:bg-slate-50"
                >
                  + カードを追加
                </button>
              </div>
            </div>
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
    case 'roulette': return { type, title: '何が出るかな？', choices: [
      { id: '1', label: '大成功', color: '#ef4444', weight: 1, actions: [] },
      { id: '2', label: '成功', color: '#10b981', weight: 3, actions: [] },
      { id: '3', label: '失敗', color: '#6b7280', weight: 2, actions: [] }
    ] };
    case 'card': return { type, title: 'カードを引く', deckName: 'イベントカード', cards: [
      { id: '1', title: 'ラッキー', description: '何か良いことが起きるかも？', color: '#f59e0b', actions: [] },
      { id: '2', title: 'アンラッキー', description: 'ちょっと不運なことが...', color: '#6366f1', actions: [] }
    ] };
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
