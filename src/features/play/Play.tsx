import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlow, ReactFlowProvider, Background, MarkerType } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Loader2, Settings2, LogOut, SkipForward, RotateCcw, UserMinus } from 'lucide-react';
import '@xyflow/react/dist/style.css';

import { useGameSync } from '../../hooks/useGameSync';
import { loadBoard, markBoardPlayed } from '../../services/boardService';
import type { BoardData } from '../../services/boardService';
import { createGameRoom, joinGameRoom, updateGameState, updatePlayerHeartbeat, migrateHost } from '../../services/gameService';
import { CustomNode } from '../editor/canvas/CustomNode';
import { Dice } from './components/Dice';
import { Lobby } from './components/Lobby';
import { BranchChoice } from './components/BranchChoice';
import { MinigameDialog } from './components/MinigameDialog';
import { ResultScreen } from './components/ResultScreen';
import { PlayerStatusPanel } from './components/PlayerStatusPanel';
import { StealDialog } from './components/StealDialog';
import { NodeDetailPanel } from './components/NodeDetailPanel';
import { GlassCard } from '../../components/ui/GlassCard';
import { BoardRuleModal } from './components/BoardRuleModal';
import { AudioMixer } from './components/AudioMixer';
import { BridgeEdge } from './components/BridgeEdge';
import { ToastNotification, type ToastData } from '../../components/ui/ToastNotification';
import { useToast } from '../../hooks/useToast';
import { useSoundSettings } from '../../hooks/useSoundSettings';
import type { Player } from '../../types/game';
import type { NodeData, MinigameAction, StealAction } from '../../types/board';
import {
  movePlayer, movePlayerBack, processAction, checkGoal,
  calculateRanking, createLog, getNodeById,
} from '../../services/gameEngine';

const nodeTypes: Record<string, any> = {
  custom: CustomNode,
};

const edgeTypes = {
  bridge: BridgeEdge,
};

function PlayInner({ boardId, roomId }: { boardId: string; roomId: string }) {
  const { gameState, isLoading } = useGameSync(roomId);
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [showResultButton, setShowResultButton] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showPlayerPanel, setShowPlayerPanel] = useState(true);
  const [showLogPanel, setShowLogPanel] = useState(() => window.innerWidth > 640);
  const [selectedNodeData, setSelectedNodeData] = useState<NodeData | null>(null);
  const [animatingPlayer, setAnimatingPlayer] = useState<{ id: string; position: string } | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const previousLogCount = useRef<number>(0);
  const { addToast } = useToast();
  const { settings: soundSettings, setSettings: setSoundSettings, playSe, playBgm, stopBgm } = useSoundSettings();
  const logContainerRef = useRef<HTMLDivElement>(null);
  const lastActionTimestamp = useRef<number>(0);
  const navigate = useNavigate();

  // 初回参加処理
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const board = await loadBoard(boardId);
      if (cancelled || !board) { 
        if (!board) alert('盤面が見つかりません'); 
        return; 
      }
      setBoardData(board);
      markBoardPlayed(boardId).catch(() => undefined);

      // BGMの再生開始
      if (board.settings.bgmType && board.settings.bgmType !== 'none') {
        playBgm(board.settings.bgmType as any);
      }

      // sessionStorageでプレイヤーIDを保持（リロード対策）
      let pId = sessionStorage.getItem(`player-${roomId}`);
      if (!pId) {
        pId = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
        sessionStorage.setItem(`player-${roomId}`, pId);
      }
      setLocalPlayerId(pId);

      // gameStateが読み込まれるのを待つ必要がある場合があるため、
      // ここでは最低限の初期化を行い、ルーム参加は別で行うか、待機する。
      const startNodeId = board.nodes.find(n => n.data.nodeType === 'start')?.id || '';
      const initParams: Record<string, number> = {};
      board.settings.parameters.forEach(p => { initParams[p.id] = p.initialValue; });

      try {
        // joinGameRoom内で既存プレイヤーがいれば上書きを避けるロジックを検討
        const playerObj: Player = {
          id: pId,
          name: `プレイヤー${pId.slice(-3)}`,
          icon: '🎲',
          isHost: false, // join時はデフォルトfalse
          params: initParams,
          position: startNodeId,
          restTurns: 0,
          hasGoal: false,
          lastActive: Date.now(),
        };

        // 既存プレイヤーチェックをjoinGameRoom側、あるいはここで行う
        // ※この時点ではgameStateがnullの可能性があるため、サーバー側でマージされる
        await joinGameRoom(roomId, playerObj);
      } catch {
        // ルームが存在しない場合は作成
        const newPlayer: Player = {
          id: pId,
          name: `プレイヤー${pId.slice(-3)}`,
          icon: '🎲',
          isHost: true,
          params: initParams,
          position: startNodeId,
          restTurns: 0,
          hasGoal: false,
          lastActive: Date.now(),
        };
        await createGameRoom(roomId, boardId, newPlayer);
      }
    };
    init();
    return () => { 
      cancelled = true; 
      stopBgm();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, roomId]);

  // ゲーム終了検知とログ監視（トースト）
  useEffect(() => {
    if (!gameState) return;

    if (gameState.status === 'finished' && !showResult && !showResultButton) {
      setShowResultButton(true);
    }

    // 新しいログがあればトースト表示
    if (gameState.logs.length > previousLogCount.current) {
      const newLogs = gameState.logs.slice(previousLogCount.current);
      const actionLogs = newLogs.filter(log => log.type === 'action' || log.type === 'system');
      
      if (actionLogs.length > 0) {
        setToasts(prev => [
          ...prev,
          ...actionLogs.map(l => ({
            id: l.id,
            message: l.message,
            type: (l.message.includes('+') || l.message.includes('🎉') || l.message.includes('成功')) ? 'success' :
                  (l.message.includes('-') || l.message.includes('😢') || l.message.includes('失敗')) ? 'danger' :
                  l.message.includes('奪った') ? 'warning' : 'info' as ToastData['type']
          }))
        ]);
      }
      previousLogCount.current = gameState.logs.length;
    }

    // ログの自動スクロール
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }

    // 他人のアクション同期（アニメーション再生）
    if (gameState.lastAction && gameState.lastAction.timestamp > lastActionTimestamp.current) {
      lastActionTimestamp.current = gameState.lastAction.timestamp;
      const action = gameState.lastAction;
      
      if (action.playerId !== localPlayerId) {
        if (action.type === 'roll' && action.value) {
          addToast(`${gameState.players[action.playerId]?.name} が ${action.value} を出した！`, 'info');
          // 他人のサイコロSEを鳴らすなどの演出が可能
          playSe('dice');
        }
        if (action.type === 'move' && action.path) {
          animateMove(action.playerId, action.path);
        }
      }
    }
  }, [gameState, showResult, showResultButton, localPlayerId, addToast, playSe]);

  // ハートビートとホスト委譲ロジック
  useEffect(() => {
    if (!gameState || !localPlayerId || gameState.status === 'finished') return;

    // 自分のハートビートを更新 (15秒おきに緩和：通信量節約)
    const heartbeatInterval = setInterval(() => {
      updatePlayerHeartbeat(roomId, localPlayerId).catch(console.error);
    }, 15000);

    // ホストの生存確認 (20秒おきに緩和)
    const migrationInterval = setInterval(() => {
      const players = Object.values(gameState.players);
      const currentHost = players.find(p => p.isHost);
      const now = Date.now();
      
      // ホストが30秒以上不在なら委譲を検討
      if (!currentHost || (now - currentHost.lastActive > 30000)) {
        // 次のホスト候補を選出 (プレイヤーID順で一番若い生存プレイヤー)
        const activePlayers = players
          .filter(p => now - p.lastActive < 15000)
          .sort((a, b) => a.id.localeCompare(b.id));

        if (activePlayers.length > 0 && activePlayers[0].id === localPlayerId) {
          // 自分が次のホスト候補なら委譲を実行
          migrateHost(roomId, localPlayerId).then(() => {
            addToast('ホストが離脱したため、あなたが新しいホストになりました', 'info');
          }).catch(console.error);
        }
      }
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(migrationInterval);
    };
  }, [gameState, localPlayerId, roomId]);

  // ノードにプレイヤーコマ情報を付与した動的ノード一覧
  const nodesWithPlayers: Node<NodeData>[] = useMemo(() => {
    if (!boardData || !gameState) return boardData?.nodes || [];
    
    // アニメーション中のプレイヤーがいれば、その位置を優先する
    const currentPlayers = Object.values(gameState.players).map(p => 
      animatingPlayer?.id === p.id ? { ...p, position: animatingPlayer.position } : p
    );

    return boardData.nodes.map(node => {
      const playersHere = currentPlayers
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
  }, [boardData, gameState, localPlayerId, animatingPlayer]);

  // エッジ（道）の見た目をすごろく風にする
  const edgesWithStyles = useMemo(() => {
    if (!boardData) return [];
    return boardData.edges.map(e => ({
      ...e,
      type: 'bridge',
      style: { stroke: '#a855f7', ...e.style },
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#6b21a8' }
    }));
  }, [boardData]);

  // === コールバック群 ===

  // 1マスずつ進むアニメーションを実行する
  const animateMove = async (playerId: string, path: string[]) => {
    if (path.length === 0) return;
    for (const stepNodeId of path) {
      setAnimatingPlayer({ id: playerId, position: stepNodeId });
      playSe('step');
      await new Promise(r => setTimeout(r, 250)); // 速度を上げてサクサク動かす
    }
    setAnimatingPlayer(null);
  };

  const handleStartGame = useCallback(async () => {
    if (!gameState || isProcessing) return;
    try {
      setIsProcessing(true);
      await updateGameState(roomId, {
        status: 'playing',
        logs: [...gameState.logs, createLog('🎮 ゲームスタート！')],
      });
    } finally {
      setIsProcessing(false);
    }
  }, [gameState, roomId, isProcessing]);

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
    if (!gameState || !boardData || isProcessing) return;
    const currentPid = gameState.playerOrder[gameState.currentTurnIndex];
    if (currentPid !== localPlayerId) return;
    
    setIsProcessing(true);
    try {
      playSe('dice');

      const player = gameState.players[currentPid];
      const logs = [...gameState.logs, createLog(`🎲 ${player.name} が ${result} を出した！`, 'move')];

      // コマ移動
      const moveResult = movePlayer(player.position, result, boardData.nodes, boardData.edges);

      // アニメーション実行
      await animateMove(currentPid, moveResult.passedNodeIds);

      // 他のプレイヤーに同期
      await updateGameState(roomId, {
        lastAction: {
          playerId: currentPid,
          type: 'roll',
          value: result,
          path: moveResult.passedNodeIds,
          timestamp: Date.now(),
        }
      } as any);

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
    } finally {
      setIsProcessing(false);
    }
  }, [gameState, boardData, roomId, localPlayerId, playSe, isProcessing]);

  // 分岐選択の処理
  const handleBranchSelect = useCallback(async (_edgeId: string, targetNodeId: string) => {
    if (!gameState || !boardData || isProcessing) return;
    const currentPid = gameState.playerOrder[gameState.currentTurnIndex];
    const player = gameState.players[currentPid];
    const logs = [...gameState.logs, createLog(`➡️ ${player.name} が「${getNodeById(targetNodeId, boardData.nodes)?.data.label || targetNodeId}」を選択`, 'move')];

    setIsProcessing(true);
    try {
      await processLanding(player, targetNodeId, logs);
    } finally {
      setIsProcessing(false);
    }
  }, [gameState, boardData, roomId, isProcessing]);

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
      playSe('goal');
    }

    // マスのアクション処理
    const node = getNodeById(nodeId, boardData.nodes);
    if (node) {
      setSelectedNodeData(node.data);
    }
    
    if (node?.data.actions && node.data.actions.length > 0) {
      for (const action of node.data.actions) {
        const result = processAction(action, updatedPlayer, gameState, boardData.nodes, boardData.edges, boardData.settings);
        updatedPlayer = result.updatedPlayer;
        logs.push(...result.logs);

        // アクション種類に応じたSE
        if (action.type === 'paramChange' && action.amount > 0) playSe('coin');
        else if (action.type === 'paramChange' && action.amount < 0) playSe('lose');
        else if (action.type === 'minigame' || action.type === 'steal') playSe('event');
        else if (action.type === 'warp') playSe('event');

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
            const backPath: string[] = [];
            let currentPosForBack = updatedPlayer.position;
            for(let i=0; i<result.additionalMoveSteps; i++) {
              const prev = movePlayerBack(currentPosForBack, 1, boardData.nodes, boardData.edges);
              if (prev === currentPosForBack) break;
              backPath.push(prev);
              currentPosForBack = prev;
            }
            await animateMove(updatedPlayer.id, backPath);
            updatedPlayer.position = currentPosForBack;
          } else {
            const additionalMove = movePlayer(updatedPlayer.position, result.additionalMoveSteps, boardData.nodes, boardData.edges);
            await animateMove(updatedPlayer.id, additionalMove.passedNodeIds);

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

    // ゲーム終了判定（1人プレイでもゴール=終了）
    const allGoaled = Object.values(updatedPlayers).every(p => p.hasGoal);
    if (allGoaled) {
      playSe('goal');
      await updateGameState(roomId, {
        logs: [...logs, createLog('🏆 全員ゴール！ゲーム終了！')],
        [`players.${updatedPlayer.id}`]: updatedPlayer,
        status: 'finished',
        pendingInteraction: null,
      } as any);
      // 即座にリザルトボタンを表示（Firestore同期待ちを回避）
      setShowResultButton(true);
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
    const updatedPlayer = { ...player, params: { ...player.params } };
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
        {showRuleModal && boardData && (
          <BoardRuleModal settings={boardData.settings} onClose={() => setShowRuleModal(false)} />
        )}
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
          edges={edgesWithStyles}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          onNodeClick={handleNodeClick}
          fitView
          zoomOnPinch={true}
          panOnScroll={false}
          maxZoom={1.5}
          minZoom={0.2}
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
      {(gameState.status === 'playing' || gameState.status === 'finished') && (
        <div className="absolute inset-0 z-10 pointer-events-none p-2 sm:p-4 flex flex-col justify-between">
          <ToastNotification toasts={toasts} removeToast={(id) => setToasts(ts => ts.filter(t => t.id !== id))} />

          {/* 上部 */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4 relative">
            <div className="pointer-events-auto relative">
              <AnimatePresence>
                {showPlayerPanel && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <PlayerStatusPanel
                      players={gameState.players}
                      playerOrder={gameState.playerOrder}
                      currentTurnIndex={gameState.currentTurnIndex}
                      localPlayerId={localPlayerId}
                      parameters={boardData.settings.parameters}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => setShowPlayerPanel(!showPlayerPanel)}
                className="mt-2 ml-2 pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50"
              >
                {showPlayerPanel ? 'プレイヤー窓を隠す' : 'プレイヤー窓を表示'}
              </button>
            </div>

            <div className="pointer-events-auto hidden sm:flex flex-col items-end relative">
              <AnimatePresence>
                {showLogPanel && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                    <GlassCard className="p-4 w-72">
                      <h3 className="font-bold text-slate-800 mb-2 text-sm">📜 ゲームログ</h3>
                      <div ref={logContainerRef} className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {gameState.logs.slice(-50).map((log) => (
                          <div key={log.id} className={`text-[11px] p-2 rounded-lg border border-slate-100 ${
                            log.type === 'action' ? 'bg-purple-50 text-purple-700' :
                            log.type === 'move' ? 'bg-blue-50 text-blue-700' :
                            'bg-white/70 text-slate-600'
                          }`}>
                            {log.message}
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => setShowLogPanel(!showLogPanel)}
                className="mt-2 mr-2 pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50"
              >
                {showLogPanel ? 'ログを隠す' : 'ログを表示'}
              </button>
            </div>
          </div>

          <div className="pointer-events-auto absolute right-2 top-16 sm:right-4 sm:top-16 flex flex-col gap-2 items-end z-20">
            <div className="flex gap-2">
              <button
                onClick={() => setShowRuleModal(true)}
                className="w-10 h-10 rounded-xl bg-white/90 shadow-lg backdrop-blur-md hover:bg-purple-50 text-slate-700 hover:text-purple-700 transition-colors flex items-center justify-center"
                title="ルールを確認"
              >
                <BookOpen className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className={`w-10 h-10 rounded-xl shadow-lg backdrop-blur-md transition-colors flex items-center justify-center ${
                  showSettingsMenu ? 'bg-purple-100 text-purple-700' : 'bg-white/90 text-slate-700 hover:bg-slate-50'
                }`}
                title="設定メニュー"
              >
                <Settings2 className="w-5 h-5" />
              </button>
            </div>

            {/* 設定ドロップダウンメニュー */}
            <AnimatePresence>
              {showSettingsMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="bg-white/90 backdrop-blur-md shadow-xl rounded-2xl p-4 flex flex-col gap-4 w-64 border border-slate-100"
                >
                  <h3 className="text-sm font-bold text-slate-700 pb-2 border-b border-slate-100">⚙️ ゲーム設定</h3>
                  <AudioMixer settings={soundSettings} onChange={setSoundSettings} />
                  
                  {gameState.players[localPlayerId]?.isHost && (
                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                      <h3 className="text-xs font-bold text-purple-600 mb-1">ホストメニュー</h3>
                      <button
                        onClick={handleSkipTurn}
                        className="flex items-center gap-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors"
                      >
                        <SkipForward className="w-3.5 h-3.5" /> ターンを強制スキップ
                      </button>
                      <button
                        onClick={handleResetGame}
                        className="flex items-center gap-2 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> ゲームをリセット
                      </button>
                      
                      {gameState.playerOrder.length > 1 && (
                        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">プレイヤーを退出させる</span>
                          {gameState.playerOrder.filter(id => id !== localPlayerId).map(pid => (
                            <button
                              key={pid}
                              onClick={() => {
                                if (window.confirm(`${gameState.players[pid]?.name} を退出させますか？`)) {
                                  handleRemovePlayer(pid);
                                }
                              }}
                              className="flex w-full items-center justify-between gap-2 text-xs font-medium bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 px-2 py-1.5 rounded border border-slate-200 transition-colors"
                            >
                              <span className="truncate">{gameState.players[pid]?.name}</span>
                              <UserMinus className="w-3.5 h-3.5 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (window.confirm('本当に退出しますか？')) navigate('/');
                    }}
                    className="flex items-center justify-center gap-2 text-sm font-bold text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors mt-2"
                  >
                    <LogOut className="w-4 h-4" /> 退出する
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 下部：アクションエリア */}
          <div className="flex justify-center mb-3 sm:mb-6 pointer-events-auto">
            {showResultButton ? (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => {
                  setShowResultButton(false);
                  setShowResult(true);
                }}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xl px-8 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all animate-pulse"
              >
                🏆 ゲーム終了！結果を見る
              </motion.button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="max-w-[92vw] bg-white/90 backdrop-blur-md px-4 sm:px-6 py-2 rounded-2xl sm:rounded-full shadow-lg font-bold text-slate-800 text-sm sm:text-base text-center">
                  {isMyTurn ? (
                    <span className="text-purple-600">🎲 あなたのターン！サイコロを振ろう</span>
                  ) : (
                    <span>{currentPlayer?.name} のターンを待っています...</span>
                  )}
                </div>
                <Dice
                  diceType={boardData.settings.diceType}
                  onRollComplete={handleRollComplete}
                  disabled={!isMyTurn || !!pending || isProcessing}
                />
              </div>
            )}
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
