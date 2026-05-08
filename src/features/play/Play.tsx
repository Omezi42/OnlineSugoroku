import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react';
import { Loader2 } from 'lucide-react';
import '@xyflow/react/dist/style.css';

import { useGameSync } from '../../hooks/useGameSync';
import { loadBoard } from '../../services/boardService';
import type { BoardData } from '../../services/boardService';
import { createGameRoom, joinGameRoom, updateGameState } from '../../services/gameService';
import { CustomNode } from '../editor/canvas/CustomNode';
import { Dice } from './components/Dice';
import { GlassCard } from '../../components/ui/GlassCard';
import type { Player } from '../../types/game';

const nodeTypes: any = {
  custom: CustomNode,
};

function PlayInner({ roomId }: { roomId: string }) {
  const { gameState, isLoading } = useGameSync(roomId);
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string>('');

  useEffect(() => {
    // 開発用モック: ランダムなプレイヤーIDを生成し参加処理を行う
    const mockJoin = async () => {
      // 実際にはURLパラメータやボードのデータからroomIdを取り扱うが、今回は簡単のためボードとルームのIDを同一視する
      const board = await loadBoard(roomId);
      if (!board) {
        alert('盤面が見つかりません');
        return;
      }
      setBoardData(board);

      const pId = `player-${Math.floor(Math.random() * 1000)}`;
      setLocalPlayerId(pId);
      
      const newPlayer: Player = {
        id: pId,
        name: `プレイヤー ${pId.slice(-3)}`,
        icon: '🎲',
        isHost: false, // 簡易実装
        params: {},
        position: board.nodes.find(n => n.data.nodeType === 'start')?.id || '',
        restTurns: 0,
        hasGoal: false,
      };

      try {
        await joinGameRoom(roomId, newPlayer);
      } catch (e) {
        // Roomが無い場合は作る（最初の参加者）
        newPlayer.isHost = true;
        await createGameRoom(roomId, roomId, newPlayer);
      }
    };
    mockJoin();
  }, [roomId]);

  if (isLoading || !boardData || !gameState) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.playerOrder[gameState.currentTurnIndex]];
  const isMyTurn = currentPlayer?.id === localPlayerId;

  const handleRollComplete = async (result: number) => {
    if (!isMyTurn) return;
    
    // ログを追加して次のターンへ（移動処理等は一旦モック）
    const newLogs = [...gameState.logs, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: `${currentPlayer.name} が ${result} を出しました！`,
      type: 'move' as const
    }];

    const nextIndex = (gameState.currentTurnIndex + 1) % gameState.playerOrder.length;

    await updateGameState(roomId, {
      logs: newLogs,
      currentTurnIndex: nextIndex
    });
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden relative">
      {/* 背景のボード (Read Only) */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <ReactFlow
          nodes={boardData.nodes}
          edges={boardData.edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
        >
          <Background gap={16} size={1} color="#e2e8f0" />
        </ReactFlow>
      </div>

      {/* UI オーバーレイ */}
      <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
        
        {/* ヘッダー情報 */}
        <div className="flex justify-between items-start">
          <GlassCard className="pointer-events-auto p-4 w-64">
            <h2 className="font-bold text-slate-800 mb-2">参加プレイヤー</h2>
            <div className="space-y-2">
              {gameState.playerOrder.map((pid, idx) => (
                <div key={pid} className={`flex items-center gap-2 p-2 rounded-lg ${idx === gameState.currentTurnIndex ? 'bg-purple-100 ring-2 ring-purple-400' : 'bg-white/50'}`}>
                  <span className="text-xl">{gameState.players[pid].icon}</span>
                  <span className="font-medium text-sm truncate">{gameState.players[pid].name}</span>
                  {pid === localPlayerId && <span className="text-[10px] bg-slate-200 px-1 rounded">You</span>}
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="pointer-events-auto p-4 w-72 h-64 overflow-y-auto flex flex-col-reverse">
            <div className="space-y-2">
              {gameState.logs.map((log) => (
                <div key={log.id} className="text-sm text-slate-700 bg-white/50 p-2 rounded">
                  {log.message}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* 画面下部のアクションエリア */}
        <div className="flex justify-center mb-8 pointer-events-auto">
          {gameState.status === 'playing' || gameState.status === 'waiting' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-lg font-bold text-slate-800">
                {isMyTurn ? (
                  <span className="text-purple-600">あなたのターンです！ダイスを振ってください</span>
                ) : (
                  <span>{currentPlayer?.name} のターンを待っています...</span>
                )}
              </div>
              
              <Dice 
                diceType={boardData.settings.diceType} 
                onRollComplete={handleRollComplete} 
                disabled={!isMyTurn}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function Play() {
  const { roomId } = useParams();
  
  if (!roomId) return <div>Invalid Room ID</div>;

  return (
    <ReactFlowProvider>
      <PlayInner roomId={roomId} />
    </ReactFlowProvider>
  );
}
