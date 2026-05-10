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
  updateNodesData: (ids: string[], data: Partial<NodeData>) => void;
  updateNode: (id: string, updates: Partial<Node<NodeData>>) => void;
  removeNode: (id: string) => void;
  updateBoardSettings: (settings: Partial<BoardSettings>) => void;

  undo: () => void;
  redo: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  applyLayout: (mode: LayoutMode) => void;
  applyTemplate: (template: TemplateType) => void;
  setSnapToGrid: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  snapSelectedToGrid: () => void;
  resetStore: () => void;
  mergeRemoteState: (data: { nodes: Node<NodeData>[]; edges: Edge[]; settings: BoardSettings }) => void;
  connectionSourceId: string | null;
  setConnectionSourceId: (id: string | null) => void;
}

const defaultBoardSettings: BoardSettings = {
  parameters: [{ id: 'money', name: 'お金', initialValue: 1000 }],
  diceType: '1d6',
  winCondition: { type: 'speed' },
  goalRewards: { 1: { money: 5000 }, 2: { money: 3000 }, 3: { money: 1000 } },
  background: 'dot',
  areas: [],
  reducedMotion: false,
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

const layoutNodes = (nodes: Node<NodeData>[], mode: LayoutMode, targetIds?: Set<string>): Node<NodeData>[] => {
  const allBoardNodes = selectableNodes(nodes);
  const boardNodes = targetIds 
    ? allBoardNodes.filter(n => targetIds.has(n.id))
    : allBoardNodes;
  
  if (boardNodes.length === 0) return nodes;

  const centerX = 420;
  const centerY = 280;
  const radius = Math.max(220, boardNodes.length * 42);

  let targetIndex = 0;
  const targetIdSet = targetIds || new Set(boardNodes.map(n => n.id));

  return nodes.map((node) => {
    if (!targetIdSet.has(node.id) || node.data.nodeType === 'area') return node;
    const index = targetIndex++;
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
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];
  const addEdgeHelper = (source: string, target: string, label?: string, id?: string) => {
    const edgeId = id || `e-${source}-${target}`;
    edges.push({ id: edgeId, source, target, label, animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } });
    return edgeId;
  };

  if (template === 'party') {
    // パーティー: 20マス超、ミニゲーム・分岐・ワープ満載の王道ルート
    const partyData = [
      { label: 'スタート', type: 'start' },
      { label: 'おこづかい', type: 'plus', actions: [{ type: 'paramChange', paramId: 'money', amount: 500 }] },
      { label: 'じゃんけん', type: 'stop', actions: [{ type: 'minigame', gameType: 'janken', winActions: [{ type: 'paramChange', paramId: 'money', amount: 2000 }], loseActions: [{ type: 'paramChange', paramId: 'money', amount: -300 }] }] },
      { label: '1マス戻る', type: 'minus', actions: [{ type: 'backN', amount: 1 }] },
      { label: '宝くじ', type: 'stop', actions: [{ type: 'randomBranch', probability: 30, successEdgeId: 'party-win', failureEdgeId: 'party-lose' }] },
      { label: '休息所', type: 'normal' }, // lose route target
      { label: '豪華客船', type: 'plus', actions: [{ type: 'paramChange', paramId: 'money', amount: 3000 }] }, // win route target
      { label: 'ショップ', type: 'stop', actions: [{ type: 'paramChange', paramId: 'money', amount: -1000 }, { type: 'moveN', amount: 5 }] },
      { label: '落とし穴', type: 'minus', actions: [{ type: 'backN', amount: 3 }] },
      { label: 'ワープ入口', type: 'plus', actions: [{ type: 'warp', targetNodeId: 'party-warp-exit' }] },
      { label: 'ハイ＆ロー', type: 'stop', actions: [{ type: 'minigame', gameType: 'highlow', winActions: [{ type: 'paramChange', paramId: 'money', amount: 3000 }], loseActions: [] }] },
      { label: '給料日', type: 'plus', actions: [{ type: 'paramChange', paramId: 'money', amount: 1500 }] },
      { label: 'ふりだしへ', type: 'minus', actions: [{ type: 'warp', targetNodeId: 'party-0' }] },
      { label: 'ラッキー', type: 'plus', actions: [{ type: 'diceParam', paramId: 'money', multiplier: 500 }] },
      { label: '関所', type: 'stop', actions: [{ type: 'conditionBranch', paramId: 'money', operator: '>=', value: 3000, trueEdgeId: 'party-pass', falseEdgeId: 'party-fail' }] },
      { label: '最終コーナー', type: 'normal' },
      { label: 'ゴール', type: 'goal', actions: [{ type: 'goalBonus' }] },
    ];

    // ノード生成 (蛇行)
    partyData.forEach((nd, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const x = 150 + (row % 2 === 0 ? col : 5 - col) * 220;
      const y = 150 + row * 200;
      nodes.push(createNode(`party-${i}`, nd.label, nd.type as NodeType, x, y, '', (nd as any).actions));
      
      // 通常のエッジ接続（分岐マス以外）
      if (i > 0 && ![5, 6, 7, 15, 16].includes(i)) {
        addEdgeHelper(`party-${i-1}`, `party-${i}`);
      }
    });

    // 分岐エッジの作成
    addEdgeHelper('party-4', 'party-6', '当選！', 'party-win');
    addEdgeHelper('party-4', 'party-5', 'ハズレ', 'party-lose');
    addEdgeHelper('party-5', 'party-7');
    addEdgeHelper('party-6', 'party-7');
    
    addEdgeHelper('party-14', 'party-16', '合格', 'party-pass');
    addEdgeHelper('party-14', 'party-15', '不合格', 'party-fail');
    addEdgeHelper('party-15', 'party-16');

    // 特殊ワープ出口
    nodes.push(createNode('party-warp-exit', 'ワープ出口', 'plus', 150, 750, 'ショートカット成功！'));
    addEdgeHelper('party-warp-exit', 'party-13');

    // 背景エリア
    nodes.push({
      id: 'party-area', type: 'custom', position: { x: 50, y: 50 },
      style: { width: 1400, height: 900 }, zIndex: -10,
      data: { label: 'パーティー会場', nodeType: 'area', areaColor: '#f472b6', areaWidth: 1400, areaHeight: 900 } as any
    });

    return { nodes, edges };
  }

  if (template === 'branch') {
    // 分岐戦略: 3つのルート
    nodes.push(createNode('b-start', 'スタート', 'start', 100, 300));
    nodes.push(createNode('b-fork', '運命の選択', 'stop', 350, 300, 'どの道を行く？', [
      { type: 'randomBranch', probability: 50, successEdgeId: 'e-up', failureEdgeId: 'e-down' }
    ]));

    // 上ルート: ギャンブル
    for (let i = 1; i <= 5; i++) {
      nodes.push(createNode(`b-up-${i}`, `カジノ${i}`, 'stop', 350 + i * 250, 100, 'ハイリスク・ハイリターン', [{ type: 'minigame', gameType: 'chouhan', winActions: [{ type: 'paramChange', paramId: 'money', amount: 2000 }], loseActions: [{ type: 'paramChange', paramId: 'money', amount: -1000 }] }]));
      if (i === 1) addEdgeHelper('b-fork', 'b-up-1', '天国へ', 'e-up');
      else addEdgeHelper(`b-up-${i-1}`, `b-up-${i}`);
    }

    // 下ルート: 罠
    for (let i = 1; i <= 5; i++) {
      nodes.push(createNode(`b-down-${i}`, `沼地${i}`, 'minus', 350 + i * 250, 500, '足止めされる', [{ type: 'rest', turns: 1 }]));
      if (i === 1) addEdgeHelper('b-fork', 'b-down-1', '地獄へ', 'e-down');
      else addEdgeHelper(`b-down-${i-1}`, `b-down-${i}`);
    }

    nodes.push(createNode('b-goal', 'ゴール', 'goal', 1800, 300));
    addEdgeHelper('b-up-5', 'b-goal');
    addEdgeHelper('b-down-5', 'b-goal');

    nodes.push({
      id: 'b-area', type: 'custom', position: { x: 50, y: 50 },
      style: { width: 2000, height: 600 }, zIndex: -10,
      data: { label: '分岐の迷宮', nodeType: 'area', areaColor: '#6366f1', areaWidth: 2000, areaHeight: 600 } as any
    });

    return { nodes, edges };
  }

  if (template === 'long') {
    // ロング: 50マスを超える壮大な旅路。ギミック攻略が鍵を握るロングコース
    const ROWS = 6;
    const COLS = 9;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        const isStart = i === 0;
        const isGoal = i === ROWS * COLS - 1;
        const col = r % 2 === 0 ? c : (COLS - 1) - c;
        
        let type: NodeType = 'normal';
        let actions: NodeData['actions'] = [];
        let label = `${i}マス`;

        if (isStart) { type = 'start'; label = 'スタート'; }
        else if (isGoal) { type = 'goal'; label = 'ゴール'; actions = [{ type: 'goalBonus' }]; }
        else if (i % 12 === 0) { type = 'stop'; label = 'ミニゲーム'; actions = [{ type: 'minigame', gameType: 'janken', winActions: [], loseActions: [] }]; }
        else if (i % 7 === 0) { type = 'plus'; label = 'ボーナス'; actions = [{ type: 'paramChange', paramId: 'money', amount: 1000 }]; }
        else if (i % 8 === 0) { type = 'minus'; label = 'トラブル'; actions = [{ type: 'paramChange', paramId: 'money', amount: -500 }]; }
        else if (i === 15) { type = 'plus'; label = 'ワープ'; actions = [{ type: 'warp', targetNodeId: 'long-35' }]; }
        else if (i === 45) { type = 'minus'; label = '落とし穴'; actions = [{ type: 'warp', targetNodeId: 'long-30' }]; }

        nodes.push(createNode(`long-${i}`, label, type, 150 + col * 200, 150 + r * 180, '', actions));
        if (i > 0) addEdgeHelper(`long-${i-1}`, `long-${i}`);
      }
    }

    nodes.push({
      id: 'long-area', type: 'custom', position: { x: 50, y: 50 },
      style: { width: 2000, height: 1200 }, zIndex: -10,
      data: { label: '果てしない旅路', nodeType: 'area', areaColor: '#10b981', areaWidth: 2000, areaHeight: 1200 } as any
    });

    return { nodes, edges };
  }

  // デフォルト (Simple)
  const simpleNodes = [
    createNode('s-start', 'スタート', 'start', 100, 300),
    createNode('s-1', 'プラス', 'plus', 350, 300, '+500円', [{ type: 'paramChange', paramId: 'money', amount: 500 }]),
    createNode('s-2', 'マイナス', 'minus', 600, 300, '-300円', [{ type: 'paramChange', paramId: 'money', amount: -300 }]),
    createNode('s-goal', 'ゴール', 'goal', 850, 300),
  ];
  return {
    nodes: simpleNodes,
    edges: [
      { id: 'se-1', source: 's-start', target: 's-1', animated: true },
      { id: 'se-2', source: 's-1', target: 's-2', animated: true },
      { id: 'se-3', source: 's-2', target: 's-goal', animated: true },
    ]
  };
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
    
    set((state) => {
      // エリア移動時に中のノードも動かす
      const areaMoves = changes.filter(c => 
        c.type === 'position' && 
        c.dragging && 
        state.nodes.find(n => n.id === c.id)?.data.nodeType === 'area'
      ) as any[];

      let updatedNodes = applyNodeChanges(changes, state.nodes);

      if (areaMoves.length > 0) {
        areaMoves.forEach(move => {
          const areaNode = state.nodes.find(n => n.id === move.id);
          if (!areaNode) return;
          const dx = move.position.x - areaNode.position.x;
          const dy = move.position.y - areaNode.position.y;
          const width = areaNode.data.areaWidth || 400;
          const height = areaNode.data.areaHeight || 200;

          updatedNodes = updatedNodes.map(node => {
            if (node.id === areaNode.id || node.data.nodeType === 'area') return node;
            // エリアの範囲内にあるノードを一緒に動かす
            const inX = node.position.x >= areaNode.position.x && node.position.x <= areaNode.position.x + width;
            const inY = node.position.y >= areaNode.position.y && node.position.y <= areaNode.position.y + height;
            if (inX && inY) {
              return {
                ...node,
                position: {
                  x: node.position.x + dx,
                  y: node.position.y + dy
                }
              };
            }
            return node;
          });
        });
      }

      return {
        ...(shouldRecord ? pushHistory(state) : {}),
        nodes: updatedNodes,
      };
    });
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

  updateNodesData: (ids: string[], data: Partial<NodeData>) => {
    set((state) => ({
      ...pushHistory(state),
      nodes: state.nodes.map((node) =>
        ids.includes(node.id) ? { ...node, data: { ...node.data, ...data } } : node
      ),
    }));
  },

  updateNode: (id, updates) => {
    set((state) => ({
      ...pushHistory(state),
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
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

  applyLayout: (mode) => set((state) => {
    const selectedIds = state.nodes.filter(n => n.selected).map(n => n.id);
    // 1つ以上のエリアが選択されている場合、そのエリア内のノードのみを対象にする
    const selectedAreas = state.nodes.filter(n => n.selected && n.data.nodeType === 'area');
    let targetIds: Set<string> | undefined;

    if (selectedAreas.length > 0) {
      targetIds = new Set();
      selectedAreas.forEach(area => {
        const width = area.data.areaWidth || 400;
        const height = area.data.areaHeight || 200;
        state.nodes.forEach(node => {
          if (node.data.nodeType === 'area') return;
          const inX = node.position.x >= area.position.x && node.position.x <= area.position.x + width;
          const inY = node.position.y >= area.position.y && node.position.y <= area.position.y + height;
          if (inX && inY) targetIds?.add(node.id);
        });
      });
    } else if (selectedIds.length > 0) {
      targetIds = new Set(selectedIds);
    }

    return { 
      ...pushHistory(state), 
      nodes: layoutNodes(state.nodes, mode, targetIds) 
    };
  }),

  applyTemplate: (template) => {
    const next = createTemplate(template);
    set((state) => ({
      ...pushHistory(state),
      nodes: next.nodes,
      edges: next.edges,
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

  resetStore: () => set({
    nodes: [],
    edges: [],
    boardSettings: defaultBoardSettings,
    past: [],
    future: [],
    clipboard: null,
    snapToGrid: true,
    gridSize: 24,
  }),

  mergeRemoteState: (remoteData) => set((state) => {
    // 操作中（選択中またはドラッグ中）のローカルノードは上書きせず保持する
    const newNodes = remoteData.nodes.map(remoteNode => {
      const localNode = state.nodes.find(n => n.id === remoteNode.id);
      if (localNode && (localNode.selected || localNode.dragging)) {
        return localNode;
      }
      return remoteNode;
    });

    // リモートにまだ存在しないが、ローカルで操作中の新規ノードを保持する
    const newLocalNodes = state.nodes.filter(
      n => !remoteData.nodes.find(rn => rn.id === n.id) && (n.selected || n.dragging)
    );

    return {
      nodes: [...newNodes, ...newLocalNodes],
      edges: remoteData.edges,
      boardSettings: remoteData.settings,
    };
  }),
  connectionSourceId: null,
  setConnectionSourceId: (id) => set({ connectionSourceId: id }),
}));
