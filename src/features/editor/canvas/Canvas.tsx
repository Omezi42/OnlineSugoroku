import React, { useCallback, useRef, useState } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, useReactFlow, MarkerType } from '@xyflow/react';
import type { NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useEditorStore } from '../store';
import { CustomNode } from './CustomNode';
import { ButtonEdge } from './ButtonEdge';
import type { NodeType, NodeSize } from '../../../types/board';
import type { EditorPresence } from '../../../services/boardService';
import { MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  button: ButtonEdge,
};

export const Canvas = ({ 
  onCursorMove, 
  remotePresences = [] 
}: { 
  onCursorMove?: (cursor: { x: number; y: number }) => void;
  remotePresences?: EditorPresence[];
}) => {
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
    const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    if (connectionSourceId) {
      setMousePos(flowPos);
    }
    
    // スロットリング（50msおきに送信）
    const now = Date.now();
    if (onCursorMove && (!lastMoveTime.current || now - lastMoveTime.current > 50)) {
      onCursorMove(flowPos);
      lastMoveTime.current = now;
    }
  }, [connectionSourceId, screenToFlowPosition, onCursorMove]);

  const lastMoveTime = useRef<number>(0);

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
        
        {/* 他人のプレゼンス（カーソルと選択） */}
        <div className="react-flow__presence-layer pointer-events-none absolute inset-0 z-[100]">
          <AnimatePresence>
            {remotePresences.map((presence) => (
              <React.Fragment key={presence.id}>
                {/* カーソル */}
                <motion.div
                  initial={false}
                  animate={{ x: presence.cursor.x, y: presence.cursor.y }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.5 }}
                  className="absolute left-0 top-0 z-[110]"
                >
                  <MousePointer2 
                    className="w-5 h-5 -rotate-90" 
                    style={{ fill: presence.color, stroke: 'white', strokeWidth: 2 }} 
                  />
                  <div 
                    className="absolute left-4 top-4 px-1.5 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-sm"
                    style={{ backgroundColor: presence.color }}
                  >
                    {presence.name}
                  </div>
                </motion.div>

                {/* 他人が選択中のマスの強調 */}
                {presence.selectedNodeId && nodes.find(n => n.id === presence.selectedNodeId) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: 0.3,
                      x: nodes.find(n => n.id === presence.selectedNodeId)!.position.x - 4,
                      y: nodes.find(n => n.id === presence.selectedNodeId)!.position.y - 4,
                      width: (nodes.find(n => n.id === presence.selectedNodeId)!.measured?.width || 128) + 8,
                      height: (nodes.find(n => n.id === presence.selectedNodeId)!.measured?.height || 128) + 8,
                    }}
                    exit={{ opacity: 0 }}
                    className="absolute rounded-2xl border-2 border-dashed pointer-events-none"
                    style={{ borderColor: presence.color, backgroundColor: presence.color }}
                  />
                )}
              </React.Fragment>
            ))}
          </AnimatePresence>
        </div>

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
