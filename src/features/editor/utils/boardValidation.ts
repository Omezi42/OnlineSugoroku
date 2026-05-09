import type { Edge, Node } from '@xyflow/react';
import type { NodeData } from '../../../types/board';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateBoard(nodes: Node<NodeData>[], edges: Edge[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const playableNodes = nodes.filter((node) => node.data.nodeType !== 'area');
  const nodeIds = new Set(playableNodes.map((node) => node.id));
  const edgeIds = new Set(edges.map((edge) => edge.id));
  const outgoing = new Map<string, string[]>();

  edges.forEach((edge) => {
    if (!nodeIds.has(edge.source)) errors.push(`存在しないマスからルートが伸びています: ${edge.source}`);
    if (!nodeIds.has(edge.target)) errors.push(`存在しないマスへルートが接続されています: ${edge.target}`);
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    outgoing.get(edge.source)?.push(edge.target);
  });

  const duplicatedLabels = playableNodes
    .map((node) => node.data.label?.trim())
    .filter((label, index, labels): label is string => Boolean(label) && labels.indexOf(label) !== index);
  if (duplicatedLabels.length > 0) {
    warnings.push(`同じ名前のマスがあります: ${Array.from(new Set(duplicatedLabels)).join(', ')}`);
  }

  const startNodes = playableNodes.filter((node) => node.data.nodeType === 'start');
  if (startNodes.length === 0) errors.push('スタートマスが配置されていません');
  if (startNodes.length > 1) warnings.push(`スタートマスが${startNodes.length}個あります（通常は1つ）`);

  const goalNodes = playableNodes.filter((node) => node.data.nodeType === 'goal');
  if (goalNodes.length === 0) errors.push('ゴールマスが配置されていません');

  // 各ノードからの次の移動先候補を収集（エッジ + ワープ）
  const nextNodesMap = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!nextNodesMap.has(edge.source)) nextNodesMap.set(edge.source, []);
    nextNodesMap.get(edge.source)?.push(edge.target);
  });
  
  playableNodes.forEach((node) => {
    node.data.actions?.forEach((action) => {
      if (action.type === 'warp' && action.targetNodeId) {
        if (!nextNodesMap.has(node.id)) nextNodesMap.set(node.id, []);
        nextNodesMap.get(node.id)?.push(action.targetNodeId);
      }
    });
  });

  // どこにも繋がっていないマスの判定（ワープも含む）
  const hasConnection = new Set<string>();
  nextNodesMap.forEach((targets, source) => {
    hasConnection.add(source);
    targets.forEach(t => hasConnection.add(t));
  });
  
  const isolated = playableNodes.filter((node) => !hasConnection.has(node.id) && playableNodes.length > 1);
  if (isolated.length > 0) {
    warnings.push(`${isolated.length}個のマスがどこにも繋がっていません: ${isolated.map((node) => node.data.label).join(', ')}`);
  }

  const unnamed = playableNodes.filter((node) => !node.data.label || node.data.label.trim() === '');
  if (unnamed.length > 0) warnings.push(`${unnamed.length}個のマスにラベルが未設定です`);

  if (startNodes[0]) {
    const reachable = new Set<string>();
    const queue = [startNodes[0].id];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || reachable.has(current)) continue;
      reachable.add(current);
      nextNodesMap.get(current)?.forEach((target) => {
        if (!reachable.has(target)) queue.push(target);
      });
    }
    const unreachable = playableNodes.filter((node) => !reachable.has(node.id));
    if (unreachable.length > 0) {
      warnings.push(`スタートから到達できないマスがあります: ${unreachable.map((node) => node.data.label).join(', ')}`);
    }
    const canReachGoal = goalNodes.some((goal) => reachable.has(goal.id));
    if (goalNodes.length > 0 && !canReachGoal) {
      errors.push('スタートからゴールまで繋がるルートがありません');
    }
  }

  playableNodes
    .filter((node) => node.data.nodeType !== 'goal' && (nextNodesMap.get(node.id)?.length || 0) === 0)
    .forEach((node) => {
      warnings.push(`「${node.data.label}」から先へ進むルートがありません`);
    });

  playableNodes.forEach((node) => {
    node.data.actions?.forEach((action) => {
      if (action.type === 'warp' && !nodeIds.has(action.targetNodeId)) {
        errors.push(`「${node.data.label}」のワープ先が見つかりません`);
      }
      if (action.type === 'conditionBranch') {
        if (!action.trueEdgeId || !action.falseEdgeId) {
          warnings.push(`「${node.data.label}」の条件分岐に、成立時/不成立時のルート指定が不足しています`);
        }
        if (action.trueEdgeId && !edgeIds.has(action.trueEdgeId)) {
          errors.push(`「${node.data.label}」の条件成立ルートが存在しません`);
        }
        if (action.falseEdgeId && !edgeIds.has(action.falseEdgeId)) {
          errors.push(`「${node.data.label}」の条件不成立ルートが存在しません`);
        }
      }
      if (action.type === 'randomBranch') {
        if (!action.successEdgeId || !action.failureEdgeId) {
          warnings.push(`「${node.data.label}」のランダム分岐に、成功時/失敗時のルート指定が不足しています`);
        }
        if (action.successEdgeId && !edgeIds.has(action.successEdgeId)) {
          errors.push(`「${node.data.label}」のランダム成功ルートが存在しません`);
        }
        if (action.failureEdgeId && !edgeIds.has(action.failureEdgeId)) {
          errors.push(`「${node.data.label}」のランダム失敗ルートが存在しません`);
        }
      }
    });
  });

  return { ok: errors.length === 0, errors, warnings };
}
