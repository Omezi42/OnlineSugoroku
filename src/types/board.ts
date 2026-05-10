// マスの種類
export type NodeType = 'start' | 'goal' | 'plus' | 'minus' | 'stop' | 'normal' | 'area';

// マスのサイズ
export type NodeSize = 'small' | 'medium' | 'large';

// サイコロの種類
export type DiceType = '1d6' | '2d6' | '1d4' | '1d10' | 'coin';

// 勝利条件
export type WinConditionType = 'speed' | 'status';

// 条件分岐の演算子
export type Operator = '>' | '>=' | '==' | '<=' | '<';

// 12種類+αのアクション定義
export type ActionType =
  | 'paramChange'     // パラメータ増減
  | 'moveN'           // Nマス進む
  | 'backN'           // Nマス戻る
  | 'rest'            // 1回休み
  | 'diceMove'        // サイコロで移動
  | 'diceParam'       // サイコロでパラメータ増減
  | 'goalBonus'       // ゴール順位ボーナス
  | 'warp'            // ワープ
  | 'conditionBranch' // 条件分岐
  | 'randomBranch'    // ランダム分岐
  | 'steal'           // プレイヤー干渉（奪う）
  | 'minigame'        // ミニゲーム
  | 'roulette'        // ルーレット
  | 'card';           // カードドロー

export interface BaseAction {
  type: ActionType;
}

export interface ParamChangeAction extends BaseAction {
  type: 'paramChange';
  paramId: string;
  amount: number;
}

export interface MoveNAction extends BaseAction {
  type: 'moveN';
  amount: number;
}

export interface BackNAction extends BaseAction {
  type: 'backN';
  amount: number;
}

export interface RestAction extends BaseAction {
  type: 'rest';
  turns: number;
}

export interface DiceMoveAction extends BaseAction {
  type: 'diceMove';
}

export interface DiceParamAction extends BaseAction {
  type: 'diceParam';
  paramId: string;
  multiplier: number;
}

export interface GoalBonusAction extends BaseAction {
  type: 'goalBonus';
}

export interface WarpAction extends BaseAction {
  type: 'warp';
  targetNodeId: string;
}

export interface ConditionBranchAction extends BaseAction {
  type: 'conditionBranch';
  paramId: string;
  operator: Operator;
  value: number;
  trueEdgeId?: string;
  falseEdgeId?: string;
}

export interface RandomBranchAction extends BaseAction {
  type: 'randomBranch';
  probability: number;
  successEdgeId?: string;
  failureEdgeId?: string;
}

export interface StealAction extends BaseAction {
  type: 'steal';
  target: 'random' | 'select';
  paramId: string;
  amount: number;
}

export interface MinigameAction extends BaseAction {
  type: 'minigame';
  gameType: 'highlow' | 'janken' | 'chouhan';
  winActions: Action[];
  loseActions: Action[];
  winEdgeId?: string;
  loseEdgeId?: string;
}

export interface RouletteChoice {
  id: string;
  label: string;
  color: string;
  weight: number;
  actions: Action[];
}

export interface RouletteAction extends BaseAction {
  type: 'roulette';
  title: string;
  choices: RouletteChoice[];
}

export interface CardItem {
  id: string;
  title: string;
  description: string;
  image?: string;
  color: string;
  actions: Action[];
}

export interface CardAction extends BaseAction {
  type: 'card';
  title: string;
  deckName: string;
  cards: CardItem[];
  backImage?: string;
}

export type Action =
  | ParamChangeAction
  | MoveNAction
  | BackNAction
  | RestAction
  | DiceMoveAction
  | DiceParamAction
  | GoalBonusAction
  | WarpAction
  | ConditionBranchAction
  | RandomBranchAction
  | StealAction
  | MinigameAction
  | RouletteAction
  | CardAction;

// カスタムパラメータ定義
export interface ParameterDef {
  id: string;
  name: string;
  initialValue: number;
}

// 盤面全体の設定
export interface BoardSettings {
  parameters: ParameterDef[];
  diceType: DiceType;
  winCondition: {
    type: WinConditionType;
    targetParamId?: string;
  };
  goalRewards: Record<number, Record<string, number>>;
  background: 'dot' | 'grid' | 'none';
  bgmType?: string;
  areas: AreaDef[];
  reducedMotion: boolean;
}

// エリア定義
export interface AreaDef {
  id: string;
  name: string;
  color: string;
  bounds: { x: number; y: number; width: number; height: number };
}

// React Flow ノードデータのカスタムプロパティ
export interface NodeData extends Record<string, unknown> {
  label: string;
  description: string;
  nodeType: NodeType;
  image?: string;
  color?: string;
  size: NodeSize;
  isStop: boolean;
  actions: Action[];
  areaColor?: string;
  areaWidth?: number;
  areaHeight?: number;
  playersOnNode?: { id: string; name: string; icon: string; isMe?: boolean }[];
}
