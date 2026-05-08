import { doc, setDoc, updateDoc, onSnapshot, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { GameState, Player, LogEntry } from '../types/game';

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
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(docRef, initialState);
};

// ルームへの参加
export const joinGameRoom = async (roomId: string, player: Player) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);
  
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
export const updateGameState = async (roomId: string, updates: Partial<GameState>) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};
