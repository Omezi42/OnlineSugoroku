import {
  arrayUnion,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { GameState, LogEntry, PendingInteraction, Player } from '../types/game';

const GAMES_COLLECTION = 'games';
const MAX_LOG_ENTRIES = 80;

type PendingGuard =
  | 'none'
  | {
      type: PendingInteraction['type'];
      playerId: string;
    };

interface UpdateGuard {
  currentPlayerId?: string;
  pending?: PendingGuard;
  hostPlayerId?: string;
}

const trimLogs = (logs: LogEntry[]) => logs.slice(-MAX_LOG_ENTRIES);

const normalizeUpdates = (updates: Record<string, unknown>) => {
  const normalized = { ...updates };
  if (Array.isArray(normalized.logs)) {
    normalized.logs = trimLogs(normalized.logs as LogEntry[]);
  }
  return normalized;
};

const assertGuard = (state: GameState, guard?: UpdateGuard) => {
  if (!guard) return;

  if (guard.currentPlayerId) {
    const currentPlayerId = state.playerOrder[state.currentTurnIndex];
    if (currentPlayerId !== guard.currentPlayerId) {
      throw new Error('現在のターンではありません。画面を同期してからもう一度お試しください。');
    }
  }

  if (guard.pending === 'none' && state.pendingInteraction) {
    throw new Error('ほかの入力待ち処理が残っています。');
  }

  if (guard.pending && guard.pending !== 'none') {
    const pending = state.pendingInteraction;
    if (!pending || pending.type !== guard.pending.type || pending.playerId !== guard.pending.playerId) {
      throw new Error('入力待ちの内容が更新されています。');
    }
  }

  if (guard.hostPlayerId && !state.players[guard.hostPlayerId]?.isHost) {
    throw new Error('ホストだけが実行できます。');
  }
};

const createInitialState = (roomId: string, boardId: string, hostPlayer: Player): GameState => ({
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
});

// ルーム作成。すでに存在する場合は上書きせず、作成者を参加者として復帰させます。
export const createGameRoom = async (roomId: string, boardId: string, hostPlayer: Player) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists()) {
      transaction.set(docRef, createInitialState(roomId, boardId, hostPlayer));
      return;
    }

    const state = snapshot.data() as GameState;
    const existingPlayer = state.players?.[hostPlayer.id];
    transaction.update(docRef, {
      [`players.${hostPlayer.id}`]: {
        ...hostPlayer,
        ...existingPlayer,
        lastActive: Date.now(),
      },
      playerOrder: arrayUnion(hostPlayer.id),
      updatedAt: serverTimestamp(),
    });
  });
};

// ルーム参加。再読み込み時は既存の進行状況を維持します。
export const joinGameRoom = async (roomId: string, player: Player) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }

    const state = snapshot.data() as GameState;
    const existingPlayer = state.players?.[player.id];
    transaction.update(docRef, {
      [`players.${player.id}`]: {
        ...player,
        ...existingPlayer,
        lastActive: Date.now(),
      },
      playerOrder: arrayUnion(player.id),
      updatedAt: serverTimestamp(),
    });
  });
};

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

// ゲーム状態の更新。guard を渡した場合は transaction で古い操作や二重操作を防ぎます。
export const updateGameState = async (
  roomId: string,
  updates: Record<string, unknown>,
  guard?: UpdateGuard
) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);
  const payload = {
    ...normalizeUpdates(updates),
    updatedAt: serverTimestamp(),
  };

  if (!guard) {
    await updateDoc(docRef, payload);
    return;
  }

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }
    assertGuard(snapshot.data() as GameState, guard);
    transaction.update(docRef, payload);
  });
};

export const updatePlayerHeartbeat = async (roomId: string, playerId: string) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);
  await updateDoc(docRef, {
    [`players.${playerId}.lastActive`]: Date.now(),
    updatedAt: serverTimestamp(),
  });
};

// ホスト移譲。複数ホストにならないよう、全員を一度 false にしてから新ホストだけ true にします。
export const migrateHost = async (roomId: string, newHostId: string) => {
  const docRef = doc(db, GAMES_COLLECTION, roomId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }

    const state = snapshot.data() as GameState;
    const updates: Record<string, unknown> = {};
    Object.keys(state.players).forEach((playerId) => {
      updates[`players.${playerId}.isHost`] = playerId === newHostId;
    });
    updates.updatedAt = serverTimestamp();
    transaction.update(docRef, updates);
  });
};
