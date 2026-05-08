import { useCallback, useRef } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useReactFlow } from '@xyflow/react';
import type { NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useEditorStore } from '../store';
import { CustomNode } from './CustomNode';
import type { NodeType, NodeSize } from '../../../types/board';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export const Canvas = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useEditorStore();
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
        data: {
          label: '新しいマス',
          description: '',
          nodeType: type,
          size: 'medium' as NodeSize,
          isStop: type === 'stop',
          actions: [],
        },
      };

      addNode(newNode);
    },
    [addNode, screenToFlowPosition]
  );

  return (
    <div className="flex-grow h-full relative" ref={reactFlowWrapper}>
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
        selectionOnDrag
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        connectionLineStyle={{ stroke: '#a855f7', strokeWidth: 3 }}
        defaultEdgeOptions={{
          style: { stroke: '#a855f7', strokeWidth: 2 },
          animated: true,
        }}
      >
        <Background gap={16} size={1} color="#e2e8f0" />
        <Controls className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border-none" />
        <MiniMap className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg" />
      </ReactFlow>
    </div>
  );
};
