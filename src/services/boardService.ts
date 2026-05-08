import { collection, doc, setDoc, getDoc, getDocs, query, where, limit, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Node, Edge } from '@xyflow/react';
import type { BoardSettings, NodeData } from '../types/board';

export interface BoardData {
  id?: string; // 保存時に生成
  name: string;
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

export const listBoards = async (maxCount = 12): Promise<BoardData[]> => {
  const boardsQuery = query(
    collection(db, BOARDS_COLLECTION),
    where('isPublic', '==', true),
    limit(maxCount)
  );
  const snapshot = await getDocs(boardsQuery);
  return snapshot.docs
    .map((item) => item.data() as BoardData)
    .sort((a, b) => {
      return timestampToMillis(b.updatedAt) - timestampToMillis(a.updatedAt);
    });
};
