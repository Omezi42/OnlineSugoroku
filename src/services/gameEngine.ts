// ゲームエンジン: コマ移動、アクション処理、ターン進行を担当
import type { Node, Edge } from '@xyflow/react';
import type { NodeData, Action, BoardSettings } from '../types/board';
import type { GameState, Player, LogEntry, PendingInteraction } from '../types/game';

// === ユーティリティ ===

// ログエントリを生成
export function createLog(
  message: string, 
  type: LogEntry['type'] = 'system',
  senderInfo?: { id: string; name: string; icon: string }
): LogEntry {
  return { 
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, 
    timestamp: Date.now(), 
    message, 
    type,
    senderId: senderInfo?.id,
    senderName: senderInfo?.name,
    senderIcon: senderInfo?.icon,
  };
}

// 指定ノードから出ているエッジ一覧を取得
export function getOutgoingEdges(nodeId: string, edges: Edge[]): Edge[] {
  return edges.filter(e => e.source === nodeId);
}

// エッジのターゲットノードを取得
export function getNodeById(nodeId: string, nodes: Node<NodeData>[]): Node<NodeData> | undefined {
  return nodes.find(n => n.id === nodeId);
}

// === コマ移動ロジック ===

export interface MoveResult {
  finalNodeId: string;
  passedNodeIds: string[]; // 通過したマスのID（stopマスで止まった場合はそこまで）
  remainingSteps: number;
  needsBranchChoice: boolean;
  branchOptions?: { edgeId: string; targetNodeId: string; label?: string }[];
}

/**
 * プレイヤーを指定歩数だけ進める
 * 分岐がある場合はneedsBranchChoice=trueを返す
 */
export function movePlayer(
  currentNodeId: string,
  steps: number,
  nodes: Node<NodeData>[],
  edges: Edge[]
): MoveResult {
  let nodeId = currentNodeId;
  const passed: string[] = [];
  let remaining = steps;

  for (let i = 0; i < steps; i++) {
    const outgoing = getOutgoingEdges(nodeId, edges);

    if (outgoing.length === 0) {
      // 行き止まり → ここで止まる
      break;
    }

    if (outgoing.length > 1) {
      // プレイヤーによる手動分岐。ただし、自動分岐アクションがある場合はそちらを優先するためここでは停止する
      const node = getNodeById(nodeId, nodes);
      const hasAutoBranch = node?.data.actions?.some(a => a.type === 'conditionBranch' || a.type === 'randomBranch');

      if (hasAutoBranch) {
        return {
          finalNodeId: nodeId,
          passedNodeIds: passed,
          remainingSteps: remaining,
          needsBranchChoice: false,
        };
      }

      // 手動分岐の選択肢を提示
      return {
        finalNodeId: nodeId,
        passedNodeIds: passed,
        remainingSteps: remaining,
        needsBranchChoice: true,
        branchOptions: outgoing.map(e => ({
          edgeId: e.id,
          targetNodeId: e.target,
          label: getNodeById(e.target, nodes)?.data.label || e.target,
        })),
      };
    }

    // 1本道 → 進む
    const nextNodeId = outgoing[0].target;
    const nextNode = getNodeById(nextNodeId, nodes);
    passed.push(nextNodeId);
    nodeId = nextNodeId;
    remaining--;

    // isStopマスの場合、残り歩数があっても止まる
    if (nextNode?.data.isStop && remaining > 0) {
      break;
    }
  }

  return {
    finalNodeId: nodeId,
    passedNodeIds: passed,
    remainingSteps: 0,
    needsBranchChoice: false,
  };
}

/**
 * プレイヤーをNマス戻す（移動履歴を使用）
 */
export function movePlayerBack(
  moveHistory: string[],
  steps: number
): { finalNodeId: string; passedNodeIds: string[] } {
  const history = [...moveHistory];
  const passed: string[] = [];
  
  for (let i = 0; i < steps; i++) {
    if (history.length <= 1) break; // スタート地点より前には戻れない
    history.pop(); // 現在地点を削除
    const prevNodeId = history[history.length - 1];
    passed.push(prevNodeId);
  }

  return {
    finalNodeId: history[history.length - 1] || moveHistory[0],
    passedNodeIds: passed,
  };
}

// === アクション処理 ===

export interface ActionResult {
  updatedPlayer: Player;
  logs: LogEntry[];
  pendingInteraction?: PendingInteraction;
  additionalMoveSteps?: number; // moveN/backNなどで追加移動が必要
  additionalMoveDirection?: 'forward' | 'back';
  warpTarget?: string; // ワープ先ノードID
  branchTarget?: string; // 条件/ランダム分岐で選ばれた移動先
  extraUpdates?: Record<string, unknown>; // 他プレイヤーなど、操作中プレイヤー以外への反映
}

/**
 * 各アクションの処理スタック
 */
const ACTION_HANDLERS: Record<
  Action['type'],
  (action: any, player: Player, context: { gameState: GameState; nodes: Node<NodeData>[]; edges: Edge[]; settings: BoardSettings }) => ActionResult
> = {
  paramChange: (action, player, { settings }) => {
    const updatedPlayer = { ...player, params: { ...player.params } };
    const paramName = settings.parameters.find(p => p.id === action.paramId)?.name || action.paramId;
    updatedPlayer.params[action.paramId] = (updatedPlayer.params[action.paramId] || 0) + action.amount;
    const sign = action.amount >= 0 ? '+' : '';
    const logs = [createLog(`${player.name} の ${paramName} が ${sign}${action.amount} （→ ${updatedPlayer.params[action.paramId]}）`, 'action')];
    return { updatedPlayer, logs };
  },

  moveN: (action, player) => {
    const logs = [createLog(`${player.name} が ${action.amount}マス進む！`, 'action')];
    return { updatedPlayer: player, logs, additionalMoveSteps: action.amount, additionalMoveDirection: 'forward' };
  },

  backN: (action, player) => {
    const logs = [createLog(`${player.name} が ${action.amount}マス戻る…`, 'action')];
    return { updatedPlayer: player, logs, additionalMoveSteps: action.amount, additionalMoveDirection: 'back' };
  },

  rest: (action, player) => {
    const updatedPlayer = { ...player };
    updatedPlayer.restTurns = (updatedPlayer.restTurns || 0) + action.turns;
    const logs = [createLog(`${player.name} は ${action.turns}回休み！`, 'action')];
    return { updatedPlayer, logs };
  },

  diceMove: (_action, player) => {
    // 演出のためにここではサイコロを振らず、PendingInteractionを返す
    const logs = [createLog(`${player.name} がイベントサイコロを振る！`, 'action')];
    return {
      updatedPlayer: player,
      logs,
      pendingInteraction: {
        playerId: player.id,
        type: 'diceRoll',
        nodeId: player.position,
      },
    };
  },

  diceParam: (action, player) => {
    // 演出のためにここではサイコロを振らず、PendingInteractionを返す
    const logs = [createLog(`${player.name} がイベントサイコロを振る！`, 'action')];
    return {
      updatedPlayer: player,
      logs,
      pendingInteraction: {
        playerId: player.id,
        type: 'diceRoll',
        nodeId: player.position,
        action,
      },
    };
  },

  goalBonus: (_action, player, { gameState, settings }) => {
    const updatedPlayer = { ...player, params: { ...player.params } };
    const logs: LogEntry[] = [];
    const rank = updatedPlayer.rank || Object.values(gameState.players).filter(p => p.hasGoal).length + 1;
    const rewards = settings.goalRewards[rank];
    if (rewards) {
      Object.entries(rewards).forEach(([paramId, amount]) => {
        updatedPlayer.params[paramId] = (updatedPlayer.params[paramId] || 0) + amount;
        const paramName = settings.parameters.find(p => p.id === paramId)?.name || paramId;
        logs.push(createLog(`🏆 ${player.name} が ${rank}位ゴールボーナス: ${paramName} +${amount}`, 'action'));
      });
    }
    return { updatedPlayer, logs };
  },

  warp: (action, player, { nodes }) => {
    const targetNode = getNodeById(action.targetNodeId, nodes);
    const targetLabel = targetNode?.data.label || action.targetNodeId;
    const logs = [createLog(`✨ ${player.name} が「${targetLabel}」にワープ！`, 'action')];
    return { updatedPlayer: player, logs, warpTarget: action.targetNodeId };
  },

  conditionBranch: (action, player, { nodes, edges, settings }) => {
    const val = player.params[action.paramId] || 0;
    let conditionMet = false;
    switch (action.operator) {
      case '>': conditionMet = val > action.value; break;
      case '>=': conditionMet = val >= action.value; break;
      case '==': conditionMet = val === action.value; break;
      case '<=': conditionMet = val <= action.value; break;
      case '<': conditionMet = val < action.value; break;
    }
    const paramName = settings.parameters.find(p => p.id === action.paramId)?.name || action.paramId;
    const logs = [createLog(`条件判定: ${paramName} ${action.operator} ${action.value} → ${conditionMet ? '✅ 成立' : '❌ 不成立'}`, 'action')];
    const selectedEdgeId = conditionMet ? action.trueEdgeId : action.falseEdgeId;
    const selectedEdge = edges.find(edge => edge.id === selectedEdgeId);
    if (selectedEdge) {
      const targetLabel = getNodeById(selectedEdge.target, nodes)?.data.label || selectedEdge.target;
      logs.push(createLog(`🔀 ${conditionMet ? '成立' : '不成立'}ルートで「${targetLabel}」へ進む`, 'move'));
      return { updatedPlayer: player, logs, branchTarget: selectedEdge.target };
    }
    return { updatedPlayer: player, logs };
  },

  randomBranch: (action, player, { nodes, edges }) => {
    const roll = Math.random() * 100;
    const success = roll < action.probability;
    const logs = [createLog(`ランダム判定: ${action.probability}% → ${success ? '✅ 成功！' : '❌ 失敗…'}`, 'action')];
    const selectedEdgeId = success ? action.successEdgeId : action.failureEdgeId;
    const selectedEdge = edges.find(edge => edge.id === selectedEdgeId);
    if (selectedEdge) {
      const targetLabel = getNodeById(selectedEdge.target, nodes)?.data.label || selectedEdge.target;
      logs.push(createLog(`🎰 ${success ? '成功' : '失敗'}ルートで「${targetLabel}」へ進む`, 'move'));
      return { updatedPlayer: player, logs, branchTarget: selectedEdge.target };
    }
    return { updatedPlayer: player, logs };
  },

  steal: (action, player, { gameState, settings }) => {
    const logs: LogEntry[] = [];
    if (action.target === 'select') {
      const targets = Object.keys(gameState.players).filter(pid => pid !== player.id && !gameState.players[pid].hasGoal);
      if (targets.length === 0) {
        logs.push(createLog('対象にできるプレイヤーがいませんでした', 'action'));
        return { updatedPlayer: player, logs };
      }
      logs.push(createLog(`${player.name} が他プレイヤーから奪う！ターゲットを選択…`, 'action'));
      return {
        updatedPlayer: player,
        logs,
        pendingInteraction: {
          playerId: player.id,
          type: 'steal',
          nodeId: player.position,
          stealTargets: targets,
          action,
        },
      };
    } else {
      const targets = Object.keys(gameState.players).filter(pid => pid !== player.id && !gameState.players[pid].hasGoal);
      if (targets.length > 0) {
        const targetId = targets[Math.floor(Math.random() * targets.length)];
        const targetPlayer = gameState.players[targetId];
        const paramName = settings.parameters.find(p => p.id === action.paramId)?.name || action.paramId;
        const stolen = Math.min(action.amount, targetPlayer.params[action.paramId] || 0);
        const updatedPlayer = { ...player, params: { ...player.params } };
        updatedPlayer.params[action.paramId] = (updatedPlayer.params[action.paramId] || 0) + stolen;
        logs.push(createLog(`💰 ${player.name} が ${targetPlayer.name} から ${paramName} を ${stolen} 奪った！`, 'action'));
        return {
          updatedPlayer,
          logs,
          extraUpdates: {
            [`players.${targetId}.params.${action.paramId}`]: (targetPlayer.params[action.paramId] || 0) - stolen,
          },
        };
      }
      logs.push(createLog('対象にできる他プレイヤーがいなかったため、何も起きませんでした', 'action'));
      return { updatedPlayer: player, logs };
    }
  },

  minigame: (action, player) => {
    const logs = [createLog(`🎮 ミニゲーム発生！ ${action.gameType === 'janken' ? 'じゃんけん' : action.gameType === 'highlow' ? 'ハイ＆ロー' : '丁半'}`, 'action')];
    return {
      updatedPlayer: player,
      logs,
      pendingInteraction: {
        playerId: player.id,
        type: 'minigame',
        nodeId: player.position,
        action,
      },
    };
  },

  roulette: (action, player) => {
    const logs = [createLog(`🎡 ${player.name} がルーレットを回す！`, 'action')];
    return {
      updatedPlayer: player,
      logs,
      pendingInteraction: {
        playerId: player.id,
        type: 'roulette',
        nodeId: player.position,
        action,
      },
    };
  },

  card: (action, player) => {
    const logs = [createLog(`🃏 ${player.name} がカードを引く！`, 'action')];
    return {
      updatedPlayer: player,
      logs,
      pendingInteraction: {
        playerId: player.id,
        type: 'card',
        nodeId: player.position,
        action,
      },
    };
  },
};

/**
 * 1つのアクションを処理する
 */
export function processAction(
  action: Action,
  player: Player,
  gameState: GameState,
  nodes: Node<NodeData>[],
  edges: Edge[],
  settings: BoardSettings
): ActionResult {
  const handler = ACTION_HANDLERS[action.type];
  if (handler) {
    return handler(action, player, { gameState, nodes, edges, settings });
  }
  return { updatedPlayer: player, logs: [] };
}

// === ゴール判定 ===

export function checkGoal(nodeId: string, nodes: Node<NodeData>[]): boolean {
  const node = getNodeById(nodeId, nodes);
  return node?.data.nodeType === 'goal';
}

// === 勝利判定 ===

export function checkGameEnd(gameState: GameState): boolean {
  return Object.values(gameState.players).every(p => p.hasGoal);
}

// === ランキング計算 ===

export function calculateRanking(
  gameState: GameState,
  settings: BoardSettings
): { playerId: string; rank: number; value: number }[] {
  const players = Object.values(gameState.players);

  if (settings.winCondition.type === 'speed') {
    // ゴール順
    return players
      .sort((a, b) => (a.rank || 999) - (b.rank || 999))
      .map((p, i) => ({ playerId: p.id, rank: i + 1, value: p.rank || 999 }));
  } else {
    // ステータス順
    const paramId = settings.winCondition.targetParamId || settings.parameters[0]?.id || 'money';
    return players
      .sort((a, b) => (b.params[paramId] || 0) - (a.params[paramId] || 0))
      .map((p, i) => ({ playerId: p.id, rank: i + 1, value: p.params[paramId] || 0 }));
  }
}

// サイコロのmax値を計算
export function getDiceMax(diceType: string): number {
  switch (diceType) {
    case '1d4': return 4;
    case '1d6': return 6;
    case '2d6': return 12;
    case '1d10': return 10;
    case 'coin': return 2;
    default: return 6;
  }
}

// サイコロのmin値を計算
export function getDiceMin(diceType: string): number {
  return diceType === '2d6' ? 2 : 1;
}

// サイコロを振る
export function rollDice(diceType: string): number {
  const min = getDiceMin(diceType);
  const max = getDiceMax(diceType);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
