import { collection, doc, setDoc, getDoc, getDocs, query, where, limit, serverTimestamp, increment } from 'firebase/firestore';
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
  createdAt?: unknown;
  updatedAt?: unknown;
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
  if (!board.ownerId) return true;
  return board.ownerId === userId || board.ownerId === localOwnerId;
};

export const markBoardPlayed = async (boardId: string) => {
  const docRef = doc(db, BOARDS_COLLECTION, boardId);
  await setDoc(docRef, { playCount: increment(1), updatedAt: serverTimestamp() }, { merge: true });
};
