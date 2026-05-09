import { getStraightPath, useInternalNode } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

export const BridgeEdge = ({
  id,
  source,
  target,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  // 中心座標を計算 (measuredがない場合は0として扱う)
  const sx = sourceNode.internals.positionAbsolute.x + (sourceNode.measured.width ?? 0) / 2;
  const sy = sourceNode.internals.positionAbsolute.y + (sourceNode.measured.height ?? 0) / 2;
  const tx = targetNode.internals.positionAbsolute.x + (targetNode.measured.width ?? 0) / 2;
  const ty = targetNode.internals.positionAbsolute.y + (targetNode.measured.height ?? 0) / 2;

  const [edgePath] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return (
    <>
      {/* 影・厚み部分 */}
      <path
        id={`${id}-shadow`}
        d={edgePath}
        fill="none"
        stroke="#4c1d95"
        strokeWidth={18}
        strokeLinecap="round"
        style={{ opacity: 0.15, filter: 'blur(1px)' }}
      />
      
      {/* メインの橋の土台（外枠） */}
      <path
        id={`${id}-border`}
        d={edgePath}
        fill="none"
        stroke="#6b21a8"
        strokeWidth={14}
        strokeLinecap="round"
      />

      {/* メインの橋の表面 */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="#a855f7"
        strokeWidth={10}
        strokeLinecap="round"
        style={{ ...style, transition: 'stroke 0.3s' }}
        markerEnd={markerEnd}
      />

      {/* センターライン（アナログすごろく感） */}
      <path
        id={`${id}-dash`}
        d={edgePath}
        fill="none"
        stroke="white"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray="10 15"
        style={{ opacity: 0.4 }}
      />
    </>
  );
};
