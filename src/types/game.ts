import { Action } from './board';

// プレイヤー情報
export interface Player {
  id: string;
  name: string;
  icon: string; // 画像URL または 絵文字
  isHost: boolean;
  params: Record<string, number>; // { "money": 1000, "hp": 5 } など
  position: string; // 現在いるマスのNode ID
  restTurns: number; // 休みターン数（0なら行動可能）
  rank?: number; // ゴールした順位
  hasGoal: boolean; // ゴール済みかどうか
}

// ゲームのステータス
export type GameStatus = 'waiting' | 'playing' | 'finished';

// ログエントリ
export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'system' | 'move' | 'action' | 'chat';
}

// 分岐やインタラクションなど、ユーザーの入力を待っている状態
export interface PendingInteraction {
  playerId: string;
  type: 'branch' | 'steal' | 'minigame';
  nodeId: string; // 発生したマス
  // branchの場合の選択肢（EdgeのIDなど）
  branchOptions?: { edgeId: string; targetNodeId: string; label?: string }[];
  // stealの場合の対象プレイヤーリスト
  stealTargets?: string[];
  // アクションの詳細
  action?: Action; 
}

// ゲーム全体のステート（Firestoreで同期するデータ）
export interface GameState {
  roomId: string;
  boardId: string; // プレイしている盤面のID
  status: GameStatus;
  players: Record<string, Player>; // playerId -> Player
  playerOrder: string[]; // ターン順のplayerIdリスト
  currentTurnIndex: number;
  logs: LogEntry[];
  pendingInteraction: PendingInteraction | null;
  createdAt: number;
  updatedAt: number;
}
