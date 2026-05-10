import { useCallback, useRef, useState } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, useReactFlow, MarkerType } from '@xyflow/react';
import type { NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useEditorStore } from '../store';
import { CustomNode } from './CustomNode';
import { ButtonEdge } from './ButtonEdge';
import type { NodeType, NodeSize } from '../../../types/board';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  button: ButtonEdge,
};

export const Canvas = () => {
  const { 
    nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, snapToGrid, gridSize,
    connectionSourceId, setConnectionSourceId 
  } = useEditorStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // 右クリックドラッグ接続用のマウス位置（これだけは頻繁に変わるのでローカルで保持）
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onPaneMouseMove = useCallback((event: React.MouseEvent) => {
    if (connectionSourceId) {
      setMousePos(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    }
  }, [connectionSourceId, screenToFlowPosition]);

  const onPaneMouseUp = useCallback(() => {
    setConnectionSourceId(null);
  }, [setConnectionSourceId]);

  // コンテキストメニューを無効化（右クリックドラッグを優先）
  const onContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
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
        zIndex: type === 'area' ? -10 : 0,
        data: {
          label: type === 'area' ? '新しいエリア' : '新しいマス',
          description: '',
          nodeType: type,
          size: 'medium' as NodeSize,
          isStop: type === 'stop',
          actions: [],
          areaColor: type === 'area' ? '#38bdf8' : undefined,
          areaWidth: type === 'area' ? 400 : undefined,
          areaHeight: type === 'area' ? 200 : undefined,
        },
      };

      addNode(newNode);
    },
    [addNode, screenToFlowPosition]
  );

  const sourceNode = nodes.find(n => n.id === connectionSourceId);

  return (
    <div 
      id="canvas-area" 
      className="flex-grow h-full relative" 
      ref={reactFlowWrapper}
      onContextMenu={onContextMenu}
      onPointerMove={onPaneMouseMove}
      onPointerUp={onPaneMouseUp}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={({ nodes: selectedNodes }) => {
          // 選択状態の変更を検知してログ出力（デバッグ用兼、再レンダリング保証）
          console.log('Selection changed:', selectedNodes.length);
        }}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          if (node.data.nodeType !== 'area') {
            setConnectionSourceId(node.id);
          }
        }}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid={snapToGrid}
        snapGrid={[gridSize, gridSize]}
        selectionOnDrag
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        connectionLineStyle={{ stroke: '#a855f7', strokeWidth: 3 }}
        defaultEdgeOptions={{
          type: 'button',
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
        
        {/* 右クリックドラッグ中の接続線 */}
        {sourceNode && (
          <svg className="absolute inset-0 pointer-events-none overflow-visible z-50">
            <line
              x1={sourceNode.position.x + 64} 
              y1={sourceNode.position.y + 64}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#a855f7"
              strokeWidth="4"
              strokeDasharray="8,8"
              markerEnd="url(#connection-arrow)"
            />
            <defs>
              <marker
                id="connection-arrow"
                markerWidth="10"
                markerHeight="10"
                refX="5"
                refY="5"
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 Z" fill="#a855f7" />
              </marker>
            </defs>
          </svg>
        )}
      </ReactFlow>
    </div>
  );
};
