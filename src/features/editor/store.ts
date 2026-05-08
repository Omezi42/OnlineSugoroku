import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { BoardSettings, NodeData } from '../../types/board';

interface EditorState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  boardSettings: BoardSettings;
  
  // Actions
  onNodesChange: (changes: NodeChange<Node<NodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  addNode: (node: Node<NodeData>) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  removeNode: (id: string) => void;
  
  updateBoardSettings: (settings: Partial<BoardSettings>) => void;
  
  // Undo/Redoなどの将来的な拡張用のプレースホルダー
  resetStore: () => void;
}

const defaultBoardSettings: BoardSettings = {
  parameters: [{ id: 'money', name: 'お金', initialValue: 1000 }],
  diceType: '1d6',
  winCondition: { type: 'speed' },
  goalRewards: { 1: { money: 5000 }, 2: { money: 3000 }, 3: { money: 1000 } },
  background: 'dot',
  areas: [],
};

const initialNodes: Node<NodeData>[] = [
  {
    id: 'start-node',
    type: 'custom', // 後ほどカスタムノードを作成する
    position: { x: 250, y: 250 },
    data: {
      label: 'スタート',
      description: 'ここからゲームが始まります',
      nodeType: 'start',
      size: 'medium',
      isStop: true,
      actions: [],
    },
  },
];

export const useEditorStore = create<EditorState>((set, get) => ({
  nodes: initialNodes,
  edges: [],
  boardSettings: defaultBoardSettings,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  },

  removeNode: (id) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== id),
      edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id),
    });
  },

  updateBoardSettings: (settings) => {
    set({
      boardSettings: { ...get().boardSettings, ...settings },
    });
  },

  resetStore: () => {
    set({
      nodes: initialNodes,
      edges: [],
      boardSettings: defaultBoardSettings,
    });
  },
}));
