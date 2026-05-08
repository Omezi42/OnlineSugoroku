import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { BoardSettings, NodeData, NodeType } from '../../types/board';

type LayoutMode = 'line' | 'zigzag' | 'circle';
type TemplateType = 'simple' | 'branch' | 'long';

interface HistorySnapshot {
  nodes: Node<NodeData>[];
  edges: Edge[];
  boardSettings: BoardSettings;
}

interface EditorState extends HistorySnapshot {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  clipboard: { nodes: Node<NodeData>[]; edges: Edge[] } | null;

  onNodesChange: (changes: NodeChange<Node<NodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (node: Node<NodeData>) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  removeNode: (id: string) => void;
  updateBoardSettings: (settings: Partial<BoardSettings>) => void;

  undo: () => void;
  redo: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  applyLayout: (mode: LayoutMode) => void;
  applyTemplate: (template: TemplateType) => void;
  addArea: () => void;
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

const createNode = (
  id: string,
  label: string,
  nodeType: NodeType,
  x: number,
  y: number,
  description = '',
  actions: NodeData['actions'] = []
): Node<NodeData> => ({
  id,
  type: 'custom',
  position: { x, y },
  data: {
    label,
    description,
    nodeType,
    size: nodeType === 'area' ? 'large' : 'medium',
    isStop: nodeType === 'start' || nodeType === 'stop',
    actions,
    areaColor: nodeType === 'area' ? '#38bdf8' : undefined,
    areaWidth: nodeType === 'area' ? 560 : undefined,
    areaHeight: nodeType === 'area' ? 280 : undefined,
  },
  draggable: true,
  selectable: true,
  connectable: nodeType !== 'area',
});

const initialNodes: Node<NodeData>[] = [
  createNode('start-node', 'スタート', 'start', 250, 250, 'ここからゲームが始まります'),
];

const getSnapshot = (state: HistorySnapshot): HistorySnapshot => ({
  nodes: structuredClone(state.nodes),
  edges: structuredClone(state.edges),
  boardSettings: structuredClone(state.boardSettings),
});

const pushHistory = (state: EditorState) => ({
  past: [...state.past.slice(-49), getSnapshot(state)],
  future: [],
});

const selectableNodes = (nodes: Node<NodeData>[]) => nodes.filter((node) => node.data.nodeType !== 'area');

const layoutNodes = (nodes: Node<NodeData>[], mode: LayoutMode): Node<NodeData>[] => {
  const boardNodes = selectableNodes(nodes);
  const centerX = 420;
  const centerY = 280;
  const radius = Math.max(220, boardNodes.length * 42);

  let boardIndex = 0;
  return nodes.map((node) => {
    if (node.data.nodeType === 'area') return node;
    const index = boardIndex++;
    if (mode === 'line') {
      return { ...node, position: { x: 160 + index * 190, y: 280 } };
    }
    if (mode === 'zigzag') {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const isReverse = row % 2 === 1;
      return {
        ...node,
        position: {
          x: 160 + (isReverse ? 5 - column : column) * 190,
          y: 160 + row * 180,
        },
      };
    }
    const angle = (Math.PI * 2 * index) / Math.max(boardNodes.length, 1) - Math.PI / 2;
    return {
      ...node,
      position: {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      },
    };
  });
};

const createTemplate = (template: TemplateType): Pick<HistorySnapshot, 'nodes' | 'edges'> => {
  if (template === 'branch') {
    const nodes = [
      createNode('tpl-start', 'スタート', 'start', 120, 260),
      createNode('tpl-choice', '運命の分岐', 'stop', 330, 260, '条件や確率でルートが分かれます', [
        { type: 'conditionBranch', paramId: 'money', operator: '>=', value: 1200, trueEdgeId: 'tpl-e-choice-rich', falseEdgeId: 'tpl-e-choice-poor' },
      ]),
      createNode('tpl-rich', 'ごほうび街道', 'plus', 560, 140, '条件を満たした人はこちら', [{ type: 'paramChange', paramId: 'money', amount: 500 }]),
      createNode('tpl-poor', '修行の道', 'minus', 560, 380, '条件を満たせなかった人はこちら', [{ type: 'paramChange', paramId: 'money', amount: -200 }]),
      createNode('tpl-merge', '合流地点', 'normal', 790, 260),
      createNode('tpl-goal', 'ゴール', 'goal', 1020, 260),
    ];
    return {
      nodes,
      edges: [
        { id: 'tpl-e-start-choice', source: 'tpl-start', target: 'tpl-choice', animated: true },
        { id: 'tpl-e-choice-rich', source: 'tpl-choice', target: 'tpl-rich', label: '条件成立', animated: true },
        { id: 'tpl-e-choice-poor', source: 'tpl-choice', target: 'tpl-poor', label: '条件不成立', animated: true },
        { id: 'tpl-e-rich-merge', source: 'tpl-rich', target: 'tpl-merge', animated: true },
        { id: 'tpl-e-poor-merge', source: 'tpl-poor', target: 'tpl-merge', animated: true },
        { id: 'tpl-e-merge-goal', source: 'tpl-merge', target: 'tpl-goal', animated: true },
      ],
    };
  }

  const count = template === 'long' ? 18 : 7;
  const nodes = Array.from({ length: count }, (_, index) => {
    const isStart = index === 0;
    const isGoal = index === count - 1;
    const type: NodeType = isStart ? 'start' : isGoal ? 'goal' : index % 5 === 0 ? 'stop' : index % 3 === 0 ? 'minus' : index % 2 === 0 ? 'plus' : 'normal';
    return createNode(
      `tpl-${index}`,
      isStart ? 'スタート' : isGoal ? 'ゴール' : `${index}マス目`,
      type,
      140 + (index % 6) * 180,
      160 + Math.floor(index / 6) * 170,
      '',
      type === 'plus' ? [{ type: 'paramChange', paramId: 'money', amount: 200 }] : type === 'minus' ? [{ type: 'paramChange', paramId: 'money', amount: -150 }] : []
    );
  });
  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: `tpl-e-${index}`,
    source: node.id,
    target: nodes[index + 1].id,
    animated: true,
  }));
  return { nodes, edges };
};

export const useEditorStore = create<EditorState>((set, get) => ({
  nodes: initialNodes,
  edges: [],
  boardSettings: defaultBoardSettings,
  past: [],
  future: [],
  clipboard: null,

  onNodesChange: (changes) => {
    const shouldRecord = changes.some((change) => change.type === 'remove' || (change.type === 'position' && !change.dragging));
    set((state) => ({
      ...(shouldRecord ? pushHistory(state) : {}),
      nodes: applyNodeChanges(changes, state.nodes),
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      ...pushHistory(state),
      nodes: state.nodes,
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  onConnect: (connection) => {
    set((state) => ({
      ...pushHistory(state),
      edges: addEdge({ ...connection, animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } }, state.edges),
    }));
  },

  addNode: (node) => set((state) => ({ ...pushHistory(state), nodes: [...state.nodes, node] })),

  updateNodeData: (id, data) => {
    set((state) => ({
      ...pushHistory(state),
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    }));
  },

  removeNode: (id) => {
    set((state) => ({
      ...pushHistory(state),
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
    }));
  },

  updateBoardSettings: (settings) => {
    set((state) => ({
      ...pushHistory(state),
      boardSettings: { ...state.boardSettings, ...settings },
    }));
  },

  undo: () => {
    const { past } = get();
    const previous = past.at(-1);
    if (!previous) return;
    set((state) => ({
      ...previous,
      past: state.past.slice(0, -1),
      future: [getSnapshot(state), ...state.future],
      clipboard: state.clipboard,
    }));
  },

  redo: () => {
    const { future } = get();
    const next = future[0];
    if (!next) return;
    set((state) => ({
      ...next,
      past: [...state.past, getSnapshot(state)],
      future: state.future.slice(1),
      clipboard: state.clipboard,
    }));
  },

  copySelected: () => {
    const { nodes, edges } = get();
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedIds = new Set(selectedNodes.map((node) => node.id));
    const selectedEdges = edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target));
    if (selectedNodes.length === 0) return;
    set({ clipboard: { nodes: structuredClone(selectedNodes), edges: structuredClone(selectedEdges) } });
  },

  pasteClipboard: () => {
    const { clipboard } = get();
    if (!clipboard) return;
    const idMap = new Map<string, string>();
    const stamp = Date.now();
    const nodes = clipboard.nodes.map((node, index) => {
      const newId = `${node.id}-copy-${stamp}-${index}`;
      idMap.set(node.id, newId);
      return {
        ...structuredClone(node),
        id: newId,
        selected: true,
        position: { x: node.position.x + 48, y: node.position.y + 48 },
      };
    });
    const edges = clipboard.edges.map((edge, index) => ({
      ...structuredClone(edge),
      id: `${edge.id}-copy-${stamp}-${index}`,
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
      selected: false,
    }));
    set((state) => ({
      ...pushHistory(state),
      nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), ...nodes],
      edges: [...state.edges, ...edges],
    }));
  },

  applyLayout: (mode) => set((state) => ({ ...pushHistory(state), nodes: layoutNodes(state.nodes, mode) })),

  applyTemplate: (template) => {
    const next = createTemplate(template);
    set((state) => ({
      ...pushHistory(state),
      nodes: next.nodes,
      edges: next.edges,
    }));
  },

  addArea: () => {
    const id = `area-${Date.now()}`;
    set((state) => ({
      ...pushHistory(state),
      nodes: [
        createNode(id, '新しいエリア', 'area', 180, 120, '盤面を視覚的に区切る背景エリアです'),
        ...state.nodes,
      ],
    }));
  },

  resetStore: () => {
    set({
      nodes: initialNodes,
      edges: [],
      boardSettings: defaultBoardSettings,
      past: [],
      future: [],
      clipboard: null,
    });
  },
}));
