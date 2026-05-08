import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { BoardSettings, NodeData, NodeType } from '../../types/board';

type LayoutMode = 'line' | 'zigzag' | 'circle';
type TemplateType = 'simple' | 'branch' | 'long' | 'party';

interface HistorySnapshot {
  nodes: Node<NodeData>[];
  edges: Edge[];
  boardSettings: BoardSettings;
}

interface EditorState extends HistorySnapshot {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  clipboard: { nodes: Node<NodeData>[]; edges: Edge[] } | null;
  snapToGrid: boolean;
  gridSize: number;

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
  setSnapToGrid: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  snapSelectedToGrid: () => void;
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
  createNode('start-node', 'スタート', 'start', 150, 250, 'ここからゲームが始まります'),
  createNode('node-1', 'お給料日', 'plus', 400, 250, '1000円ゲット！', [{ type: 'paramChange', paramId: 'money', amount: 1000 }]),
  createNode('goal-node', 'ゴール', 'goal', 650, 250, '早く着いた人にはボーナス！'),
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'start-node', target: 'node-1', animated: true },
  { id: 'e2', source: 'node-1', target: 'goal-node', animated: true },
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
  if (template === 'party') {
    // パーティー用テンプレ: 12マス、ミニゲームやワープなど楽しい要素たっぷり
    const nodes = [
      createNode('tpl-start', 'スタート', 'start', 100, 300),
      createNode('tpl-1', 'お給料日', 'plus', 350, 300, '1000円ゲット！', [{ type: 'paramChange', paramId: 'money', amount: 1000 }]),
      createNode('tpl-2', 'カジノ', 'stop', 600, 300, 'ハイ＆ローで一獲千金！', [{ type: 'minigame', gameType: 'highlow', winActions: [{ type: 'paramChange', paramId: 'money', amount: 3000 }], loseActions: [{ type: 'paramChange', paramId: 'money', amount: -500 }] }]),
      createNode('tpl-3', '落とし穴', 'minus', 850, 300, '500円落とした...', [{ type: 'paramChange', paramId: 'money', amount: -500 }]),
      createNode('tpl-4', '落雷', 'minus', 1100, 300, '2マス戻される！', [{ type: 'backN', amount: 2 }]),
      createNode('tpl-5', 'じゃんけん大会', 'stop', 1100, 100, 'じゃんけんで勝負！', [{ type: 'minigame', gameType: 'janken', winActions: [{ type: 'paramChange', paramId: 'money', amount: 2000 }], loseActions: [{ type: 'paramChange', paramId: 'money', amount: -300 }] }]),
      createNode('tpl-6', '宝箱', 'plus', 850, 100, 'サイコロ×500円ゲット', [{ type: 'diceParam', paramId: 'money', multiplier: 500 }]),
      createNode('tpl-7', '1回休み', 'minus', 600, 100, 'お昼寝タイム', [{ type: 'rest', turns: 1 }]),
      createNode('tpl-8', '臨時収入', 'plus', 350, 100, '800円拾った', [{ type: 'paramChange', paramId: 'money', amount: 800 }]),
      createNode('tpl-9', '丁半勝負', 'stop', 100, 100, '奇数偶数で運試し', [{ type: 'minigame', gameType: 'chouhan', winActions: [{ type: 'paramChange', paramId: 'money', amount: 1500 }], loseActions: [{ type: 'paramChange', paramId: 'money', amount: -700 }] }]),
      createNode('tpl-10', '最後の直線', 'normal', 100, -100),
      createNode('tpl-goal', 'ゴール', 'goal', 350, -100, '到着順にボーナス！', [{ type: 'goalBonus' }]),
    ];
    return {
      nodes,
      edges: [
        { id: 'tpl-e-0', source: 'tpl-start', target: 'tpl-1', animated: true },
        { id: 'tpl-e-1', source: 'tpl-1', target: 'tpl-2', animated: true },
        { id: 'tpl-e-2', source: 'tpl-2', target: 'tpl-3', animated: true },
        { id: 'tpl-e-3', source: 'tpl-3', target: 'tpl-4', animated: true },
        { id: 'tpl-e-4', source: 'tpl-4', target: 'tpl-5', animated: true },
        { id: 'tpl-e-5', source: 'tpl-5', target: 'tpl-6', animated: true },
        { id: 'tpl-e-6', source: 'tpl-6', target: 'tpl-7', animated: true },
        { id: 'tpl-e-7', source: 'tpl-7', target: 'tpl-8', animated: true },
        { id: 'tpl-e-8', source: 'tpl-8', target: 'tpl-9', animated: true },
        { id: 'tpl-e-9', source: 'tpl-9', target: 'tpl-10', animated: true },
        { id: 'tpl-e-10', source: 'tpl-10', target: 'tpl-goal', animated: true },
      ],
    };
  }

  if (template === 'branch') {
    // 分岐ルート: 条件分岐2回、ランダム分岐1回の複雑なルート (11マス)
    const nodes = [
      createNode('tpl-start', 'スタート', 'start', 100, 260),
      createNode('tpl-1', 'おこづかい', 'plus', 350, 260, '500円ゲット', [{ type: 'paramChange', paramId: 'money', amount: 500 }]),
      createNode('tpl-fork1', '運命の分岐', 'stop', 600, 260, '所持金1200以上で上ルートへ', [
        { type: 'conditionBranch', paramId: 'money', operator: '>=', value: 1200, trueEdgeId: 'tpl-e-fork1-rich', falseEdgeId: 'tpl-e-fork1-poor' },
      ]),
      createNode('tpl-rich', 'VIP通り', 'plus', 850, 100, '高級ルートで2000円ゲット', [{ type: 'paramChange', paramId: 'money', amount: 2000 }]),
      createNode('tpl-poor', '修行の道', 'minus', 850, 420, '苦難の道で500円減...', [{ type: 'paramChange', paramId: 'money', amount: -500 }]),
      createNode('tpl-merge', '合流地点', 'normal', 1100, 260),
      createNode('tpl-fork2', 'ランダム分岐', 'stop', 1350, 260, '50%の確率で天国か地獄', [
        { type: 'randomBranch', probability: 50, successEdgeId: 'tpl-e-fork2-win', failureEdgeId: 'tpl-e-fork2-lose' },
      ]),
      createNode('tpl-heaven', '天国マス', 'plus', 1600, 100, 'ラッキー！3000円', [{ type: 'paramChange', paramId: 'money', amount: 3000 }]),
      createNode('tpl-hell', '地獄マス', 'minus', 1600, 420, 'アンラッキー…1000円減', [{ type: 'paramChange', paramId: 'money', amount: -1000 }]),
      createNode('tpl-merge2', '最終合流', 'normal', 1850, 260),
      createNode('tpl-goal', 'ゴール', 'goal', 2100, 260, 'お疲れさまでした！', [{ type: 'goalBonus' }]),
    ];
    return {
      nodes,
      edges: [
        { id: 'tpl-e-start', source: 'tpl-start', target: 'tpl-1', animated: true },
        { id: 'tpl-e-1', source: 'tpl-1', target: 'tpl-fork1', animated: true },
        { id: 'tpl-e-fork1-rich', source: 'tpl-fork1', target: 'tpl-rich', label: '条件成立', animated: true },
        { id: 'tpl-e-fork1-poor', source: 'tpl-fork1', target: 'tpl-poor', label: '条件不成立', animated: true },
        { id: 'tpl-e-rich-merge', source: 'tpl-rich', target: 'tpl-merge', animated: true },
        { id: 'tpl-e-poor-merge', source: 'tpl-poor', target: 'tpl-merge', animated: true },
        { id: 'tpl-e-merge-fork2', source: 'tpl-merge', target: 'tpl-fork2', animated: true },
        { id: 'tpl-e-fork2-win', source: 'tpl-fork2', target: 'tpl-heaven', label: '成功', animated: true },
        { id: 'tpl-e-fork2-lose', source: 'tpl-fork2', target: 'tpl-hell', label: '失敗', animated: true },
        { id: 'tpl-e-heaven-merge2', source: 'tpl-heaven', target: 'tpl-merge2', animated: true },
        { id: 'tpl-e-hell-merge2', source: 'tpl-hell', target: 'tpl-merge2', animated: true },
        { id: 'tpl-e-merge2-goal', source: 'tpl-merge2', target: 'tpl-goal', animated: true },
      ],
    };
  }

  // simple / long → ハードモード (長い蛇行ルート 15マス)
  const count = template === 'long' ? 15 : 10;
  const nodeData: { label: string; type: NodeType; desc: string; actions: NodeData['actions'] }[] = [];
  for (let i = 0; i < count; i++) {
    const isStart = i === 0;
    const isGoal = i === count - 1;
    if (isStart) { nodeData.push({ label: 'スタート', type: 'start', desc: '', actions: [] }); continue; }
    if (isGoal) { nodeData.push({ label: 'ゴール', type: 'goal', desc: '', actions: [{ type: 'goalBonus' }] }); continue; }
    // パターンで配置
    if (i % 7 === 1) nodeData.push({ label: '給料日', type: 'plus', desc: '1000円ゲット', actions: [{ type: 'paramChange', paramId: 'money', amount: 1000 }] });
    else if (i % 7 === 2) nodeData.push({ label: '税金', type: 'minus', desc: '500円減', actions: [{ type: 'paramChange', paramId: 'money', amount: -500 }] });
    else if (i % 7 === 3) nodeData.push({ label: 'ミニゲーム', type: 'stop', desc: 'じゃんけんで勝負', actions: [{ type: 'minigame', gameType: 'janken', winActions: [{ type: 'paramChange', paramId: 'money', amount: 1500 }], loseActions: [{ type: 'paramChange', paramId: 'money', amount: -300 }] }] });
    else if (i % 7 === 4) nodeData.push({ label: '休憩', type: 'minus', desc: '1回休み', actions: [{ type: 'rest', turns: 1 }] });
    else if (i % 7 === 5) nodeData.push({ label: 'ボーナスマス', type: 'plus', desc: 'サイコロ×200円', actions: [{ type: 'diceParam', paramId: 'money', multiplier: 200 }] });
    else if (i % 7 === 6) nodeData.push({ label: '2マス進む', type: 'plus', desc: '追い風！', actions: [{ type: 'moveN', amount: 2 }] });
    else nodeData.push({ label: `${i}マス目`, type: 'normal', desc: '', actions: [] });
  }
  const nodes = nodeData.map((nd, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const isReverse = row % 2 === 1;
    return createNode(
      `tpl-${index}`, nd.label, nd.type,
      140 + (isReverse ? 4 - column : column) * 250,
      160 + row * 200,
      nd.desc, nd.actions
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
  edges: initialEdges,
  boardSettings: defaultBoardSettings,
  past: [],
  future: [],
  clipboard: null,
  snapToGrid: true,
  gridSize: 24,

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

  setSnapToGrid: (enabled) => set({ snapToGrid: enabled }),

  setGridSize: (size) => set({ gridSize: Math.max(8, Math.min(96, size)) }),

  snapSelectedToGrid: () => {
    set((state) => ({
      ...pushHistory(state),
      nodes: state.nodes.map((node) => {
        if (!node.selected || node.data.nodeType === 'area') return node;
        const grid = state.gridSize;
        return {
          ...node,
          position: {
            x: Math.round(node.position.x / grid) * grid,
            y: Math.round(node.position.y / grid) * grid,
          },
        };
      }),
    }));
  },

  resetStore: () => {
    set({
      nodes: initialNodes,
      edges: initialEdges,
      boardSettings: defaultBoardSettings,
      past: [],
      future: [],
      clipboard: null,
      snapToGrid: true,
      gridSize: 24,
    });
  },
}));
