import { doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import type { GameState, Player } from '../types/game';

const GAMES_COLLECTION = 'games';

// ルームの作成
export const createGameRoom = async (roomId: string, boardId: string, hostPlayer: Player) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);
  const initialState: GameState = {
    roomId,
    boardId,
    status: 'waiting',
    players: {
      [hostPlayer.id]: hostPlayer,
    },
    playerOrder: [hostPlayer.id],
    currentTurnIndex: 0,
    logs: [
      {
        id: `log-${Date.now()}`,
        timestamp: Date.now(),
        message: 'ルームが作成されました',
        type: 'system',
      },
    ],
    pendingInteraction: null,
    lastAction: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(docRef, initialState);
};

// ルームへの参加
export const joinGameRoom = async (roomId: string, player: Player) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);
  const snap = await getDoc(docRef);
  
  if (snap.exists()) {
    const data = snap.data() as GameState;
    const existingPlayer = data.players?.[player.id];
    
    if (existingPlayer) {
      // すでにプレイヤーが存在する場合、進行状況を維持しつつ参加（再接続扱い）
      const updatedPlayer = {
        ...player,
        ...existingPlayer, // 既存のステートを優先
        lastActive: Date.now(),
      };
      await updateDoc(docRef, {
        [`players.${player.id}`]: updatedPlayer,
        updatedAt: serverTimestamp(),
      });
      return;
    }
  }
  
  await updateDoc(docRef, {
    [`players.${player.id}`]: player,
    playerOrder: arrayUnion(player.id),
    updatedAt: serverTimestamp(),
  });
};

// リアルタイム同期用リスナー
export const subscribeToGameState = (
  roomId: string, 
  onUpdate: (state: GameState) => void,
  onError: (error: Error) => void
) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);
  
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as GameState);
    } else {
      onError(new Error('Room not found'));
    }
  }, onError);
};

// ゲーム状態の更新 (汎用)
export const updateGameState = async (roomId: string, updates: any) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// プレイヤーのハートビート更新
export const updatePlayerHeartbeat = async (roomId: string, playerId: string) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);
  await updateDoc(docRef, {
    [`players.${playerId}.lastActive`]: Date.now(),
    updatedAt: serverTimestamp(),
  });
};

// ホストの委譲
export const migrateHost = async (roomId: string, newHostId: string) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);
  await updateDoc(docRef, {
    [`players.${newHostId}.isHost`]: true,
    updatedAt: serverTimestamp(),
  });
};
