import { useCallback, useRef } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, useReactFlow, MarkerType } from '@xyflow/react';
import type { NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useEditorStore } from '../store';
import { CustomNode } from './CustomNode';
import type { NodeType, NodeSize } from '../../../types/board';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export const Canvas = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, snapToGrid, gridSize } = useEditorStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // screenToFlowPosition を使ってキャンバスのパン/ズームを正しく反映
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `node-${Date.now()}`,
        type: 'custom',
        position,
        style: type === 'area' ? { width: 400, height: 200 } : undefined,
        data: {
          label: type === 'area' ? '新しいエリア' : '新しいマス',
          description: '',
          nodeType: type,
          size: 'medium' as NodeSize,
          isStop: type === 'stop',
          actions: [],
          areaColor: type === 'area' ? '#38bdf8' : undefined,
        },
      };

      addNode(newNode);
    },
    [addNode, screenToFlowPosition]
  );

  return (
    <div id="canvas-area" className="flex-grow h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        snapToGrid={snapToGrid}
        snapGrid={[gridSize, gridSize]}
        selectionOnDrag
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        connectionLineStyle={{ stroke: '#a855f7', strokeWidth: 3 }}
        defaultEdgeOptions={{
          style: { stroke: '#a855f7', strokeWidth: 4, strokeLinecap: 'round' },
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: '#a855f7',
          },
        }}
      >
        <Background gap={gridSize} size={snapToGrid ? 0.5 : 1} color={snapToGrid ? '#c4b5fd' : '#e2e8f0'} variant={snapToGrid ? BackgroundVariant.Lines : BackgroundVariant.Dots} />
        <Controls className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border-none" />
        <MiniMap className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg" />
      </ReactFlow>
    </div>
  );
};
