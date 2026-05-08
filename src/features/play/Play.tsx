import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { AnimatePresence } from 'framer-motion';
import { BookOpen, Loader2 } from 'lucide-react';
import '@xyflow/react/dist/style.css';

import { useGameSync } from '../../hooks/useGameSync';
import { loadBoard } from '../../services/boardService';
import type { BoardData } from '../../services/boardService';
import { createGameRoom, joinGameRoom, updateGameState } from '../../services/gameService';
import { CustomNode } from '../editor/canvas/CustomNode';
import { Dice } from './components/Dice';
import { Lobby } from './components/Lobby';
import { BranchChoice } from './components/BranchChoice';
import { MinigameDialog } from './components/MinigameDialog';
import { ResultScreen } from './components/ResultScreen';
import { PlayerStatusPanel } from './components/PlayerStatusPanel';
import { StealDialog } from './components/StealDialog';
import { NodeDetailPanel } from './components/NodeDetailPanel';
import { HostControls } from './components/HostControls';
import { GlassCard } from '../../components/ui/GlassCard';
import { RulebookModal } from '../../components/RulebookModal';
import type { Player } from '../../types/game';
import type { NodeData, MinigameAction, StealAction } from '../../types/board';
import {
  movePlayer, movePlayerBack, processAction, checkGoal, checkGameEnd,
  calculateRanking, createLog, getNodeById,
} from '../../services/gameEngine';

const nodeTypes: Record<string, any> = {
  custom: CustomNode,
};

function PlayInner({ boardId, roomId }: { boardId: string; roomId: string }) {
  const { gameState, isLoading } = useGameSync(roomId);
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [showRulebook, setShowRulebook] = useState(false);
  const [selectedNodeData, setSelectedNodeData] = useState<NodeData | null>(null);
  const navigate = useNavigate();

  // 初回参加処理
  useEffect(() => {
    const init = async () => {
      const board = await loadBoard(boardId);
      if (!board) { alert('盤面が見つかりません'); return; }
      setBoardData(board);

      // sessionStorageでプレイヤーIDを保持（リロード対策）
      let pId = sessionStorage.getItem(`player-${roomId}`);
      if (!pId) {
        pId = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
        sessionStorage.setItem(`player-${roomId}`, pId);
      }
      setLocalPlayerId(pId);

      const startNodeId = board.nodes.find(n => n.data.nodeType === 'start')?.id || '';
      // 初期パラメータをボード設定から生成
      const initParams: Record<string, number> = {};
      board.settings.parameters.forEach(p => { initParams[p.id] = p.initialValue; });

      const newPlayer: Player = {
        id: pId,
        name: `プレイヤー${pId.slice(-3)}`,
        icon: '🎲',
        isHost: false,
        params: initParams,
        position: startNodeId,
        restTurns: 0,
        hasGoal: false,
      };

      try {
        await joinGameRoom(roomId, newPlayer);
      } catch {
        newPlayer.isHost = true;
        await createGameRoom(roomId, boardId, newPlayer);
      }
    };
    init();
  }, [boardId, roomId]);

  // ゲーム終了検知
  useEffect(() => {
    if (gameState?.status === 'finished') setShowResult(true);
  }, [gameState?.status]);

  // ノードにプレイヤーコマ情報を付与した動的ノード一覧
  const nodesWithPlayers: Node<NodeData>[] = useMemo(() => {
    if (!boardData || !gameState) return boardData?.nodes || [];
    return boardData.nodes.map(node => {
      const playersHere = Object.values(gameState.players)
        .filter(p => p.position === node.id)
        .map(p => ({ id: p.id, name: p.name, icon: p.icon, isMe: p.id === localPlayerId }));
      return {
        ...node,
        data: {
          ...node.data,
          playersOnNode: playersHere.length > 0 ? playersHere : undefined,
        },
      };
    });
  }, [boardData, gameState, localPlayerId]);

  // === コールバック群 ===

  const handleStartGame = useCallback(async () => {
    if (!gameState) return;
    await updateGameState(roomId, {
      status: 'playing',
      logs: [...gameState.logs, createLog('🎮 ゲームスタート！')],
    });
  }, [gameState, roomId]);

  const handleUpdateName = useCallback(async (name: string) => {
    if (!gameState) return;
    await updateGameState(roomId, {
      [`players.${localPlayerId}.name`]: name,
    } as any);
  }, [gameState, roomId, localPlayerId]);

  const handleUpdateIcon = useCallback(async (icon: string) => {
    if (!gameState) return;
    await updateGameState(roomId, {
      [`players.${localPlayerId}.icon`]: icon,
    } as any);
  }, [gameState, roomId, localPlayerId]);

  const handleResetGame = useCallback(async () => {
    if (!gameState || !boardData) return;
    const startNodeId = boardData.nodes.find(n => n.data.nodeType === 'start')?.id || '';
    const resetPlayers = Object.fromEntries(Object.entries(gameState.players).map(([pid, player]) => {
      const params: Record<string, number> = {};
      boardData.settings.parameters.forEach((param) => { params[param.id] = param.initialValue; });
      return [pid, {
        ...player,
        params,
        position: startNodeId,
        restTurns: 0,
        hasGoal: false,
        rank: undefined,
      }];
    }));
    await updateGameState(roomId, {
      status: 'waiting',
      players: resetPlayers,
      currentTurnIndex: 0,
      pendingInteraction: null,
      logs: [...gameState.logs, createLog('🔄 ホストがゲームをリセットしました', 'system')],
    } as any);
  }, [boardData, gameState, roomId]);

  const handleSkipTurn = useCallback(async () => {
    if (!gameState) return;
    const nextIndex = (gameState.currentTurnIndex + 1) % Math.max(gameState.playerOrder.length, 1);
    await updateGameState(roomId, {
      currentTurnIndex: nextIndex,
      pendingInteraction: null,
      logs: [...gameState.logs, createLog('⏭️ ホストがターンを送りました', 'system')],
    });
  }, [gameState, roomId]);

  const handleRemovePlayer = useCallback(async (playerId: string) => {
    if (!gameState) return;
    const player = gameState.players[playerId];
    if (!player) return;
    const players = { ...gameState.players };
    delete players[playerId];
    const playerOrder = gameState.playerOrder.filter((pid) => pid !== playerId);
    const currentTurnIndex = Math.min(gameState.currentTurnIndex, Math.max(playerOrder.length - 1, 0));
    await updateGameState(roomId, {
      players,
      playerOrder,
      currentTurnIndex,
      pendingInteraction: gameState.pendingInteraction?.playerId === playerId ? null : gameState.pendingInteraction,
      logs: [...gameState.logs, createLog(`👋 ホストが ${player.name} を退出させました`, 'system')],
    } as any);
  }, [gameState, roomId]);

  // マスクリック → 詳細パネル
  const handleNodeClick = useCallback((_: any, node: Node<NodeData>) => {
    setSelectedNodeData(node.data);
  }, []);

  // サイコロを振った後の処理
  const handleRollComplete = useCallback(async (result: number) => {
    if (!gameState || !boardData) return;
    const currentPid = gameState.playerOrder[gameState.currentTurnIndex];
    if (currentPid !== localPlayerId) return;

    const player = gameState.players[currentPid];
    const logs = [...gameState.logs, createLog(`🎲 ${player.name} が ${result} を出した！`, 'move')];

    // コマ移動
    const moveResult = movePlayer(player.position, result, boardData.nodes, boardData.edges);

    if (moveResult.needsBranchChoice && moveResult.branchOptions) {
      // 分岐選択が必要
      await updateGameState(roomId, {
        logs,
        pendingInteraction: {
          playerId: currentPid,
          type: 'branch',
          nodeId: moveResult.finalNodeId,
          branchOptions: moveResult.branchOptions,
        },
      });
      return;
    }

    // 移動完了 → マスのアクション処理へ
    await processLanding(player, moveResult.finalNodeId, logs);
  }, [gameState, boardData, roomId, localPlayerId]);

  // 分岐選択の処理
  const handleBranchSelect = useCallback(async (_edgeId: string, targetNodeId: string) => {
    if (!gameState || !boardData) return;
    const currentPid = gameState.playerOrder[gameState.currentTurnIndex];
    const player = gameState.players[currentPid];
    const logs = [...gameState.logs, createLog(`➡️ ${player.name} が「${getNodeById(targetNodeId, boardData.nodes)?.data.label || targetNodeId}」を選択`, 'move')];

    await processLanding(player, targetNodeId, logs);
  }, [gameState, boardData, roomId]);

  // マスに着地した時の処理
  const processLanding = async (player: Player, nodeId: string, logs: any[]) => {
    if (!gameState || !boardData) return;
    let updatedPlayer = { ...player, position: nodeId, params: { ...player.params } };

    // ゴール判定
    if (checkGoal(nodeId, boardData.nodes)) {
      const goalOrder = Object.values(gameState.players).filter(p => p.hasGoal).length + 1;
      updatedPlayer.hasGoal = true;
      updatedPlayer.rank = goalOrder;
      logs.push(createLog(`🏁 ${player.name} が ${goalOrder}位でゴール！！`, 'action'));
    }

    // マスのアクション処理
    const node = getNodeById(nodeId, boardData.nodes);
    if (node?.data.actions && node.data.actions.length > 0) {
      for (const action of node.data.actions) {
        const result = processAction(action, updatedPlayer, gameState, boardData.nodes, boardData.edges, boardData.settings);
        updatedPlayer = result.updatedPlayer;
        logs.push(...result.logs);

        // ペンディング操作（ミニゲームやスティール）が必要な場合
        if (result.pendingInteraction) {
          await updateGameState(roomId, {
            logs,
            [`players.${updatedPlayer.id}`]: updatedPlayer,
            pendingInteraction: result.pendingInteraction,
          } as any);
          return;
        }

        // ワープ
        if (result.warpTarget) {
          updatedPlayer.position = result.warpTarget;
        }

        // 条件分岐・ランダム分岐で選ばれた専用ルート
        if (result.branchTarget) {
          updatedPlayer.position = result.branchTarget;
        }

        // 追加移動
        if (result.additionalMoveSteps) {
          if (result.additionalMoveDirection === 'back') {
            updatedPlayer.position = movePlayerBack(updatedPlayer.position, result.additionalMoveSteps, boardData.nodes, boardData.edges);
          } else {
            const additionalMove = movePlayer(updatedPlayer.position, result.additionalMoveSteps, boardData.nodes, boardData.edges);
            if (additionalMove.needsBranchChoice && additionalMove.branchOptions) {
              await updateGameState(roomId, {
                logs,
                [`players.${updatedPlayer.id}`]: updatedPlayer,
                pendingInteraction: {
                  playerId: updatedPlayer.id,
                  type: 'branch',
                  nodeId: additionalMove.finalNodeId,
                  branchOptions: additionalMove.branchOptions,
                },
              } as any);
              return;
            }
            updatedPlayer.position = additionalMove.finalNodeId;
          }
        }
      }
    }

    // アクションによる追加移動・ワープ後にゴールへ到達した場合も判定する
    if (!updatedPlayer.hasGoal && checkGoal(updatedPlayer.position, boardData.nodes)) {
      const goalOrder = Object.values(gameState.players).filter(p => p.hasGoal).length + 1;
      updatedPlayer.hasGoal = true;
      updatedPlayer.rank = goalOrder;
      logs.push(createLog(`🏁 ${player.name} が ${goalOrder}位でゴール！！`, 'action'));
    }

    // ターン終了 → 次のプレイヤーへ
    await advanceTurn(updatedPlayer, logs);
  };

  // ターンを進める
  const advanceTurn = async (updatedPlayer: Player, logs: any[]) => {
    if (!gameState || !boardData) return;

    const updatedPlayers = { ...gameState.players, [updatedPlayer.id]: updatedPlayer };

    // ゲーム終了判定
    if (checkGameEnd({ ...gameState, players: updatedPlayers })) {
      await updateGameState(roomId, {
        logs: [...logs, createLog('🏆 全員ゴール！ゲーム終了！')],
        [`players.${updatedPlayer.id}`]: updatedPlayer,
        status: 'finished',
        pendingInteraction: null,
      } as any);
      return;
    }

    // 次のターンインデックスを計算（休み/ゴール済みをスキップ）
    let nextIdx = (gameState.currentTurnIndex + 1) % gameState.playerOrder.length;
    let safety = 0;
    const restUpdates: Record<string, any> = {}; // 休みターン消費をまとめる

    while (safety < gameState.playerOrder.length) {
      const nextPid = gameState.playerOrder[nextIdx];
      const nextP = nextPid === updatedPlayer.id ? updatedPlayer : gameState.players[nextPid];

      if (nextP?.hasGoal) {
        nextIdx = (nextIdx + 1) % gameState.playerOrder.length;
        safety++;
        continue;
      }

      if (nextP && nextP.restTurns > 0) {
        logs.push(createLog(`😴 ${nextP.name} は休みのためスキップ`, 'system'));
        restUpdates[`players.${nextPid}.restTurns`] = nextP.restTurns - 1;
        nextIdx = (nextIdx + 1) % gameState.playerOrder.length;
        safety++;
        continue;
      }

      break;
    }

    await updateGameState(roomId, {
      logs,
      [`players.${updatedPlayer.id}`]: updatedPlayer,
      currentTurnIndex: nextIdx,
      pendingInteraction: null,
      ...restUpdates,
    } as any);
  };

  // ミニゲーム結果処理
  const handleMinigameResult = useCallback(async (won: boolean) => {
    if (!gameState || !boardData) return;
    const interaction = gameState.pendingInteraction;
    if (!interaction || !interaction.action) return;
    const action = interaction.action as MinigameAction;
    const player = gameState.players[interaction.playerId];
    let updatedPlayer = { ...player, params: { ...player.params } };
    const logs = [...gameState.logs];

    logs.push(createLog(won ? `🎉 ${player.name} がミニゲームに勝利！` : `😢 ${player.name} がミニゲームに敗北...`, 'action'));

    const subActions = won ? action.winActions : action.loseActions;
    if (subActions) {
      for (const subAction of subActions) {
        const result = processAction(subAction, updatedPlayer, gameState, boardData.nodes, boardData.edges, boardData.settings);
        updatedPlayer = result.updatedPlayer;
        logs.push(...result.logs);
      }
    }

    await advanceTurn(updatedPlayer, logs);
  }, [gameState, boardData, roomId]);

  // スティールターゲット選択処理
  const handleStealSelect = useCallback(async (targetPlayerId: string) => {
    if (!gameState || !boardData) return;
    const interaction = gameState.pendingInteraction;
    if (!interaction || !interaction.action) return;
    const action = interaction.action as StealAction;
    const player = gameState.players[interaction.playerId];
    const targetPlayer = gameState.players[targetPlayerId];
    let updatedPlayer = { ...player, params: { ...player.params } };
    const logs = [...gameState.logs];

    const stolen = Math.min(action.amount, targetPlayer.params[action.paramId] || 0);
    updatedPlayer.params[action.paramId] = (updatedPlayer.params[action.paramId] || 0) + stolen;

    const paramName = boardData.settings.parameters.find(p => p.id === action.paramId)?.name || action.paramId;
    logs.push(createLog(`💰 ${player.name} が ${targetPlayer.name} から ${paramName} を ${stolen} 奪った！`, 'action'));

    // ターゲットのパラメータを減らす
    await updateGameState(roomId, {
      [`players.${targetPlayerId}.params.${action.paramId}`]: (targetPlayer.params[action.paramId] || 0) - stolen,
    } as any);

    await advanceTurn(updatedPlayer, logs);
  }, [gameState, boardData, roomId]);

  // === ローディング ===
  if (isLoading || !boardData || !gameState) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
          <p className="text-slate-500 font-medium">ゲームを読み込み中...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.playerOrder[gameState.currentTurnIndex]];
  const isMyTurn = currentPlayer?.id === localPlayerId;
  const pending = gameState.pendingInteraction;
  const isPendingMine = pending?.playerId === localPlayerId;

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden relative">
      {/* ロビー画面 */}
      {gameState.status === 'waiting' && (
        <Lobby
          roomId={roomId}
          players={gameState.players}
          playerOrder={gameState.playerOrder}
          localPlayerId={localPlayerId}
          onStartGame={handleStartGame}
          onUpdateName={handleUpdateName}
          onUpdateIcon={handleUpdateIcon}
        />
      )}

      <AnimatePresence>
        {showRulebook && <RulebookModal onClose={() => setShowRulebook(false)} />}
      </AnimatePresence>

      {/* リザルト画面 */}
      {showResult && (
        <ResultScreen
          rankings={calculateRanking(gameState, boardData.settings)}
          players={gameState.players}
          winConditionLabel={boardData.settings.winCondition.type === 'speed' ? 'ゴール順' : 'ステータス順'}
          onClose={() => navigate('/')}
        />
      )}

      {/* 分岐選択 */}
      {pending?.type === 'branch' && isPendingMine && pending.branchOptions && (
        <BranchChoice
          options={pending.branchOptions}
          onSelect={handleBranchSelect}
        />
      )}

      {/* ミニゲーム */}
      {pending?.type === 'minigame' && isPendingMine && pending.action && (pending.action as MinigameAction).gameType && (
        <MinigameDialog
          action={pending.action as MinigameAction}
          onResult={handleMinigameResult}
        />
      )}

      {/* スティール（奪う）ダイアログ */}
      {pending?.type === 'steal' && isPendingMine && pending.stealTargets && pending.action && (
        <StealDialog
          targets={pending.stealTargets}
          players={gameState.players}
          action={pending.action as StealAction}
          onSelect={handleStealSelect}
        />
      )}

      {/* 背景のボード (Read Only) - プレイヤーコマ付き */}
      <div className="absolute inset-0 z-0">
        <ReactFlow
          nodes={nodesWithPlayers}
          edges={boardData.edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          onNodeClick={handleNodeClick}
          fitView
        >
          <Background gap={16} size={1} color="#e2e8f0" />
        </ReactFlow>
      </div>

      {/* マスの詳細パネル */}
      <AnimatePresence>
        {selectedNodeData && (
          <NodeDetailPanel
            nodeData={selectedNodeData}
            onClose={() => setSelectedNodeData(null)}
          />
        )}
      </AnimatePresence>

      {/* UI オーバーレイ */}
      {gameState.status === 'playing' && (
        <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
          {/* 上部 */}
          <div className="flex justify-between items-start gap-4">
            <div className="pointer-events-auto">
              <PlayerStatusPanel
                players={gameState.players}
                playerOrder={gameState.playerOrder}
                currentTurnIndex={gameState.currentTurnIndex}
                localPlayerId={localPlayerId}
                parameters={boardData.settings.parameters}
              />
            </div>

            <GlassCard className="pointer-events-auto p-4 w-72 max-h-64 overflow-y-auto">
              <h3 className="font-bold text-slate-800 mb-2 text-sm">📜 ゲームログ</h3>
              <div className="space-y-1.5 flex flex-col-reverse">
                {gameState.logs.slice(-20).reverse().map((log) => (
                  <div key={log.id} className={`text-xs p-1.5 rounded ${
                    log.type === 'action' ? 'bg-purple-50 text-purple-700' :
                    log.type === 'move' ? 'bg-blue-50 text-blue-700' :
                    'bg-white/50 text-slate-600'
                  }`}>
                    {log.message}
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="pointer-events-auto absolute right-4 top-72 flex flex-col gap-3">
            <button
              onClick={() => setShowRulebook(true)}
              className="rounded-2xl bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-lg backdrop-blur-md hover:bg-purple-50 hover:text-purple-700 transition-colors flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              ルール
            </button>
            <HostControls
              players={gameState.players}
              playerOrder={gameState.playerOrder}
              currentTurnIndex={gameState.currentTurnIndex}
              localPlayerId={localPlayerId}
              onResetGame={handleResetGame}
              onSkipTurn={handleSkipTurn}
              onRemovePlayer={handleRemovePlayer}
            />
          </div>

          {/* 下部：アクションエリア */}
          <div className="flex justify-center mb-6 pointer-events-auto">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-lg font-bold text-slate-800">
                {isMyTurn ? (
                  <span className="text-purple-600">🎲 あなたのターン！サイコロを振ろう</span>
                ) : (
                  <span>{currentPlayer?.name} のターンを待っています...</span>
                )}
              </div>
              <Dice
                diceType={boardData.settings.diceType}
                onRollComplete={handleRollComplete}
                disabled={!isMyTurn || !!pending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Play() {
  const params = useParams();
  const roomId = params.roomId || params.boardId;
  const boardId = params.boardId || params.roomId;
  if (!roomId || !boardId) return <div className="flex h-screen items-center justify-center text-slate-500">Invalid Room ID</div>;

  return (
    <ReactFlowProvider>
      <PlayInner boardId={boardId} roomId={roomId} />
    </ReactFlowProvider>
  );
}
