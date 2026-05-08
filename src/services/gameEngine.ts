// ゲームエンジン: コマ移動、アクション処理、ターン進行を担当
import type { Node, Edge } from '@xyflow/react';
import type { NodeData, Action, BoardSettings } from '../types/board';
import type { GameState, Player, LogEntry, PendingInteraction } from '../types/game';

// === ユーティリティ ===

// ログエントリを生成
export function createLog(message: string, type: LogEntry['type'] = 'system'): LogEntry {
  return { id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now(), message, type };
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
      // 分岐 → プレイヤーに選択させる
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
 * プレイヤーをNマス戻す
 */
export function movePlayerBack(
  currentNodeId: string,
  steps: number,
  _nodes: Node<NodeData>[],
  edges: Edge[]
): string {
  let nodeId = currentNodeId;
  for (let i = 0; i < steps; i++) {
    // 逆方向: targetが現在ノードであるエッジを探す
    const incoming = edges.filter(e => e.target === nodeId);
    if (incoming.length === 0) break;
    nodeId = incoming[0].source; // 最初の入力エッジを辿る
  }
  return nodeId;
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
}

/**
 * 1つのアクションを処理する（同期的に処理できるもののみ）
 */
export function processAction(
  action: Action,
  player: Player,
  gameState: GameState,
  nodes: Node<NodeData>[],
  edges: Edge[],
  settings: BoardSettings
): ActionResult {
  const logs: LogEntry[] = [];
  const updatedPlayer = { ...player, params: { ...player.params } };

  switch (action.type) {
    case 'paramChange': {
      const paramName = settings.parameters.find(p => p.id === action.paramId)?.name || action.paramId;
      updatedPlayer.params[action.paramId] = (updatedPlayer.params[action.paramId] || 0) + action.amount;
      const sign = action.amount >= 0 ? '+' : '';
      logs.push(createLog(`${player.name} の ${paramName} が ${sign}${action.amount} （→ ${updatedPlayer.params[action.paramId]}）`, 'action'));
      return { updatedPlayer, logs };
    }

    case 'moveN':
      logs.push(createLog(`${player.name} が ${action.amount}マス進む！`, 'action'));
      return { updatedPlayer, logs, additionalMoveSteps: action.amount, additionalMoveDirection: 'forward' };

    case 'backN':
      logs.push(createLog(`${player.name} が ${action.amount}マス戻る…`, 'action'));
      return { updatedPlayer, logs, additionalMoveSteps: action.amount, additionalMoveDirection: 'back' };

    case 'rest':
      updatedPlayer.restTurns = (updatedPlayer.restTurns || 0) + action.turns;
      logs.push(createLog(`${player.name} は ${action.turns}回休み！`, 'action'));
      return { updatedPlayer, logs };

    case 'diceMove': {
      const roll = rollDice(settings.diceType);
      logs.push(createLog(`${player.name} がイベントサイコロで ${roll} を出した！`, 'action'));
      return {
        updatedPlayer,
        logs,
        additionalMoveSteps: roll,
        additionalMoveDirection: 'forward',
      };
    }

    case 'diceParam': {
      const roll = rollDice(settings.diceType);
      const paramName = settings.parameters.find(p => p.id === action.paramId)?.name || action.paramId;
      const amount = roll * action.multiplier;
      updatedPlayer.params[action.paramId] = (updatedPlayer.params[action.paramId] || 0) + amount;
      const sign = amount >= 0 ? '+' : '';
      logs.push(createLog(`${player.name} がイベントサイコロで ${roll} を出した！ ${paramName} ${sign}${amount}（→ ${updatedPlayer.params[action.paramId]}）`, 'action'));
      return {
        updatedPlayer,
        logs,
      };
    }

    case 'goalBonus': {
      // ゴールした順位に基づいてボーナスを適用
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
    }

    case 'warp': {
      const targetNode = getNodeById(action.targetNodeId, nodes);
      const targetLabel = targetNode?.data.label || action.targetNodeId;
      logs.push(createLog(`✨ ${player.name} が「${targetLabel}」にワープ！`, 'action'));
      return { updatedPlayer, logs, warpTarget: action.targetNodeId };
    }

    case 'conditionBranch': {
      const val = updatedPlayer.params[action.paramId] || 0;
      let conditionMet = false;
      switch (action.operator) {
        case '>': conditionMet = val > action.value; break;
        case '>=': conditionMet = val >= action.value; break;
        case '==': conditionMet = val === action.value; break;
        case '<=': conditionMet = val <= action.value; break;
        case '<': conditionMet = val < action.value; break;
      }
      const paramName = settings.parameters.find(p => p.id === action.paramId)?.name || action.paramId;
      logs.push(createLog(`条件判定: ${paramName} ${action.operator} ${action.value} → ${conditionMet ? '✅ 成立' : '❌ 不成立'}`, 'action'));
      const selectedEdgeId = conditionMet ? action.trueEdgeId : action.falseEdgeId;
      const selectedEdge = edges.find(edge => edge.id === selectedEdgeId);
      if (selectedEdge) {
        const targetLabel = getNodeById(selectedEdge.target, nodes)?.data.label || selectedEdge.target;
        logs.push(createLog(`🔀 ${conditionMet ? '成立' : '不成立'}ルートで「${targetLabel}」へ進む`, 'move'));
        return { updatedPlayer, logs, branchTarget: selectedEdge.target };
      }
      return { updatedPlayer, logs };
    }

    case 'randomBranch': {
      const roll = Math.random() * 100;
      const success = roll < action.probability;
      logs.push(createLog(`ランダム判定: ${action.probability}% → ${success ? '✅ 成功！' : '❌ 失敗…'}`, 'action'));
      const selectedEdgeId = success ? action.successEdgeId : action.failureEdgeId;
      const selectedEdge = edges.find(edge => edge.id === selectedEdgeId);
      if (selectedEdge) {
        const targetLabel = getNodeById(selectedEdge.target, nodes)?.data.label || selectedEdge.target;
        logs.push(createLog(`🎰 ${success ? '成功' : '失敗'}ルートで「${targetLabel}」へ進む`, 'move'));
        return { updatedPlayer, logs, branchTarget: selectedEdge.target };
      }
      return { updatedPlayer, logs };
    }

    case 'steal': {
      if (action.target === 'select') {
        // プレイヤー選択UIが必要
        const targets = Object.keys(gameState.players).filter(pid => pid !== player.id && !gameState.players[pid].hasGoal);
        logs.push(createLog(`${player.name} が他プレイヤーから奪う！ターゲットを選択…`, 'action'));
        return {
          updatedPlayer,
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
        // ランダムターゲット
        const targets = Object.keys(gameState.players).filter(pid => pid !== player.id && !gameState.players[pid].hasGoal);
        if (targets.length > 0) {
          const targetId = targets[Math.floor(Math.random() * targets.length)];
          const targetPlayer = gameState.players[targetId];
          const paramName = settings.parameters.find(p => p.id === action.paramId)?.name || action.paramId;
          const stolen = Math.min(action.amount, targetPlayer.params[action.paramId] || 0);
          updatedPlayer.params[action.paramId] = (updatedPlayer.params[action.paramId] || 0) + stolen;
          logs.push(createLog(`💰 ${player.name} が ${targetPlayer.name} から ${paramName} を ${stolen} 奪った！`, 'action'));
        }
        return { updatedPlayer, logs };
      }
    }

    case 'minigame': {
      logs.push(createLog(`🎮 ミニゲーム発生！ ${action.gameType === 'janken' ? 'じゃんけん' : action.gameType === 'highlow' ? 'ハイ＆ロー' : '丁半'}`, 'action'));
      return {
        updatedPlayer,
        logs,
        pendingInteraction: {
          playerId: player.id,
          type: 'minigame',
          nodeId: player.position,
          action,
        },
      };
    }

    default:
      return { updatedPlayer, logs };
  }
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
