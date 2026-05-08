import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Node, Edge } from '@xyflow/react';
import type { BoardSettings, NodeData } from '../types/board';

export interface BoardData {
  id?: string; // 保存時に生成
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  settings: BoardSettings;
  createdAt?: any;
  updatedAt?: any;
}

const BOARDS_COLLECTION = 'boards';

export const saveBoard = async (boardData: Omit<BoardData, 'createdAt' | 'updatedAt'>): Promise<string> => {
  const isNew = !boardData.id;
  const boardId = boardData.id || doc(collection(db, BOARDS_COLLECTION)).id;
  
  const docRef = doc(db, BOARDS_COLLECTION, boardId);
  
  const payload: any = {
    ...boardData,
    id: boardId,
    updatedAt: serverTimestamp(),
  };

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
