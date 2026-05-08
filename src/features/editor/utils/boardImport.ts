import type { Edge, Node } from '@xyflow/react';
import type { BoardSettings, NodeData, NodeType } from '../../../types/board';

export interface ImportedBoardPayload {
  name?: string;
  description?: string;
  authorName?: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  settings: BoardSettings;
}

const defaultSettings: BoardSettings = {
  parameters: [{ id: 'money', name: 'お金', initialValue: 1000 }],
  diceType: '1d6',
  winCondition: { type: 'speed' },
  goalRewards: { 1: { money: 5000 }, 2: { money: 3000 }, 3: { money: 1000 } },
  background: 'dot',
  areas: [],
};

const normalizeNodeType = (value: unknown, index: number, total: number): NodeType => {
  if (value === 'start' || value === 'goal' || value === 'plus' || value === 'minus' || value === 'stop' || value === 'normal' || value === 'area') {
    return value;
  }
  if (index === 0) return 'start';
  if (index === total - 1) return 'goal';
  return 'normal';
};

function createNode(id: string, label: string, nodeType: NodeType, index: number, description = ''): Node<NodeData> {
  const row = Math.floor(index / 6);
  const column = index % 6;
  const isReverse = row % 2 === 1;
  return {
    id,
    type: 'custom',
    position: {
      x: 140 + (isReverse ? 5 - column : column) * 180,
      y: 160 + row * 170,
    },
    data: {
      label,
      description,
      nodeType,
      size: 'medium',
      isStop: nodeType === 'start' || nodeType === 'stop',
      actions: [],
    },
    draggable: true,
    selectable: true,
    connectable: nodeType !== 'area',
  };
}

export function importBoardData(raw: unknown): ImportedBoardPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('JSONの形式を確認できませんでした。');
  }

  const data = raw as Record<string, unknown>;
  if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
    return {
      name: typeof data.name === 'string' ? data.name : undefined,
      description: typeof data.description === 'string' ? data.description : undefined,
      authorName: typeof data.authorName === 'string' ? data.authorName : undefined,
      nodes: data.nodes as Node<NodeData>[],
      edges: data.edges as Edge[],
      settings: (data.settings || defaultSettings) as BoardSettings,
    };
  }

  const candidates = data.squares || data.cells || data.spaces || data.items;
  if (!Array.isArray(candidates)) {
    throw new Error('nodes/edges、または squares/cells/spaces/items の配列が見つかりません。');
  }

  const nodes = candidates.map((item, index) => {
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const id = typeof record.id === 'string' || typeof record.id === 'number' ? String(record.id) : `legacy-${index}`;
    const label = String(record.label || record.title || record.name || `${index + 1}マス目`);
    const description = String(record.description || record.text || record.event || '');
    const nodeType = normalizeNodeType(record.nodeType || record.type, index, candidates.length);
    return createNode(id, label, nodeType, index, description);
  });

  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: `legacy-edge-${index}`,
    source: node.id,
    target: nodes[index + 1].id,
    animated: true,
    style: { stroke: '#a855f7', strokeWidth: 2 },
  }));

  return {
    name: typeof data.name === 'string' ? data.name : 'インポートしたすごろく',
    description: typeof data.description === 'string' ? data.description : '外部JSONから変換した盤面です。',
    authorName: typeof data.authorName === 'string' ? data.authorName : undefined,
    nodes,
    edges,
    settings: defaultSettings,
  };
}
