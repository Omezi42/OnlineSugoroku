import { useCallback, useRef } from 'react';
import { ReactFlow, Background, Controls, MiniMap, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useEditorStore } from '../store';
import { CustomNode } from './CustomNode';
import type { NodeType, NodeSize } from '../../../types/board';

const nodeTypes: any = {
  custom: CustomNode,
};

function CanvasInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useEditorStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = {
        x: event.clientX - (reactFlowWrapper.current?.getBoundingClientRect().left || 0),
        y: event.clientY - (reactFlowWrapper.current?.getBoundingClientRect().top || 0),
      };

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
    [addNode]
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
      >
        <Background gap={16} size={1} color="#e2e8f0" />
        <Controls className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border-none" />
        <MiniMap className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg" />
      </ReactFlow>
    </div>
  );
}

export const Canvas = () => {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
};
