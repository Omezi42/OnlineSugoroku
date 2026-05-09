import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, limit, serverTimestamp, increment } from 'firebase/firestore';
import { db } from './firebase';
import type { Node, Edge } from '@xyflow/react';
import type { BoardSettings, NodeData } from '../types/board';

export interface BoardData {
  id?: string; // 保存時に生成
  name: string;
  description?: string;
  authorName?: string;
  ownerId?: string;
  ownerName?: string;
  category?: string;
  playCount?: number;
  likeCount?: number;
  nodes: Node<NodeData>[];
  edges: Edge[];
  settings: BoardSettings;
  isPublic?: boolean;
  allowPublicEdit?: boolean; // 共同編集の許可
  reportCount?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BoardRevision {
  id: string;
  boardId: string;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  settings: BoardSettings;
  createdAt: unknown;
  note?: string;
}

const BOARDS_COLLECTION = 'boards';

const timestampToMillis = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'seconds' in value) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }
  return 0;
};

export const saveBoard = async (boardData: Omit<BoardData, 'createdAt' | 'updatedAt'>): Promise<string> => {
  const isNew = !boardData.id;
  const boardId = boardData.id || doc(collection(db, BOARDS_COLLECTION)).id;
  
  const docRef = doc(db, BOARDS_COLLECTION, boardId);
  
  // Firestoreはundefinedを許容しないため、再帰的にundefinedを除去する
  const removeUndefined = (obj: unknown): unknown => {
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, removeUndefined(v)])
      );
    }
    return obj;
  };

  const payload = removeUndefined({
    ...boardData,
    id: boardId,
    updatedAt: serverTimestamp(),
  }) as Record<string, unknown>;

  if (isNew) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(docRef, payload, { merge: true });
  return boardId;
};

export const loadBoard = async (boardId: string): Promise<BoardData | null> => {
  const docRef = doc(db, BOARDS_COLLECTION, boardId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as BoardData;
  }
  return null;
};

import { onSnapshot } from 'firebase/firestore';

export const subscribeToBoard = (boardId: string, onUpdate: (data: BoardData | null) => void): () => void => {
  const docRef = doc(db, BOARDS_COLLECTION, boardId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as BoardData);
    } else {
      onUpdate(null);
    }
  });
};

export type BoardSort = 'recent' | 'popular';

export interface ListBoardsOptions {
  maxCount?: number;
  search?: string;
  category?: string;
  sort?: BoardSort;
}

const normalizeSearchText = (board: BoardData) => {
  return `${board.name || ''} ${board.description || ''} ${board.authorName || ''} ${board.category || ''}`.toLowerCase();
};

export const listBoards = async (options: ListBoardsOptions | number = 12): Promise<BoardData[]> => {
  const normalizedOptions = typeof options === 'number' ? { maxCount: options } : options;
  const maxCount = normalizedOptions.maxCount ?? 24;
  const boardsQuery = query(
    collection(db, BOARDS_COLLECTION),
    where('isPublic', '==', true),
    limit(Math.max(maxCount, 48))
  );
  const snapshot = await getDocs(boardsQuery);
  const search = normalizedOptions.search?.trim().toLowerCase();
  const category = normalizedOptions.category;
  const sort = normalizedOptions.sort ?? 'recent';

  return snapshot.docs
    .map((item) => item.data() as BoardData)
    .filter((board) => !category || category === 'all' || board.category === category)
    .filter((board) => !search || normalizeSearchText(board).includes(search))
    .sort((a, b) => {
      if (sort === 'popular') {
        const aScore = (a.playCount || 0) * 3 + (a.likeCount || 0);
        const bScore = (b.playCount || 0) * 3 + (b.likeCount || 0);
        if (aScore !== bScore) return bScore - aScore;
      }
      return timestampToMillis(b.updatedAt) - timestampToMillis(a.updatedAt);
    })
    .slice(0, maxCount);
};

export const listMyBoards = async (ownerId: string, maxCount = 30): Promise<BoardData[]> => {
  const boardsQuery = query(
    collection(db, BOARDS_COLLECTION),
    where('ownerId', '==', ownerId),
    limit(maxCount)
  );
  const snapshot = await getDocs(boardsQuery);
  return snapshot.docs
    .map((item) => item.data() as BoardData)
    .sort((a, b) => timestampToMillis(b.updatedAt) - timestampToMillis(a.updatedAt));
};

export const canEditBoard = (board: BoardData, userId?: string | null, localOwnerId?: string | null) => {
  // 共同編集が許可されている場合は誰でも編集可能
  if (board.allowPublicEdit) return true;
  // 未ログインの新規盤面などは誰でも編集可能（保存時に所有者が決まる）
  if (!board.ownerId) return true;
  // オーナー一致確認
  return board.ownerId === userId || board.ownerId === localOwnerId;
};

// リビジョンの保存
export const saveRevision = async (boardId: string, board: Partial<BoardData>, note?: string): Promise<void> => {
  const revRef = doc(collection(db, BOARDS_COLLECTION, boardId, 'revisions'));
  const payload = {
    id: revRef.id,
    boardId,
    name: board.name || '無題のリビジョン',
    nodes: board.nodes || [],
    edges: board.edges || [],
    settings: board.settings || {},
    createdAt: serverTimestamp(),
    note: note || '',
  };
  await setDoc(revRef, payload);
};

// リビジョンのメモ更新
export const updateRevisionNote = async (boardId: string, revisionId: string, note: string): Promise<void> => {
  const revRef = doc(db, BOARDS_COLLECTION, boardId, 'revisions', revisionId);
  await setDoc(revRef, { note }, { merge: true });
};

// リビジョン一覧の取得
export const getRevisions = async (boardId: string): Promise<BoardRevision[]> => {
  const q = query(
    collection(db, BOARDS_COLLECTION, boardId, 'revisions'),
    where('boardId', '==', boardId), // サブコレクションなので本来不要だが、安全のため
    limit(20)
  );
  const snap = await getDocs(q);
  const revs = snap.docs.map(d => d.data() as BoardRevision);
  // クライアントサイドでのソート（serverTimestampが含まれるため）
  return revs.sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
};

export const markBoardPlayed = async (boardId: string) => {
  const docRef = doc(db, BOARDS_COLLECTION, boardId);
  await setDoc(docRef, { playCount: increment(1), updatedAt: serverTimestamp() }, { merge: true });
};

export const deleteBoard = async (boardId: string) => {
  const docRef = doc(db, BOARDS_COLLECTION, boardId);
  await deleteDoc(docRef);
};

// 盤面の複製
export const cloneBoard = async (board: BoardData, newOwnerId: string, newOwnerName: string): Promise<string> => {
  const { id: _oldId, createdAt: _ca, updatedAt: _ua, playCount: _pc, reportCount: _rc, ...rest } = board;
  return await saveBoard({
    ...rest,
    name: `${board.name} (コピー)`,
    ownerId: newOwnerId,
    ownerName: newOwnerName,
    isPublic: false, // 複製直後は非公開
    allowPublicEdit: false,
  });
};

// 通報
export const reportBoard = async (boardId: string) => {
  const docRef = doc(db, BOARDS_COLLECTION, boardId);
  await setDoc(docRef, { reportCount: increment(1) }, { merge: true });
};
