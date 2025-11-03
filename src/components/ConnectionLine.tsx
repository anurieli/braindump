'use client'

import { useState, useEffect } from 'react';
import { useStore } from '@/store';

export default function ConnectionLine() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const connectionSourceId = useStore(state => state.connectionSourceId);
  const connectionStartPosition = useStore(state => state.connectionStartPosition);
  const isCreatingConnection = useStore(state => state.isCreatingConnection);
  const hoveredNodeId = useStore(state => state.hoveredNodeId);
  const viewport = useStore(state => state.viewport);
  const ideas = useStore(state => state.ideas);
  const edges = useStore(state => state.edges);
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    if (isCreatingConnection && connectionSourceId) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [isCreatingConnection, connectionSourceId]);
  
  // Early return if not creating connection or missing start position
  if (!isCreatingConnection || !connectionSourceId || !connectionStartPosition) {
    return null;
  }
  
  const sourceIdea = ideas[connectionSourceId];
  if (!sourceIdea) {
    return null;
  }
  
  // Use the actual screen position where the handle was clicked
  const sourceCenterScreenX = connectionStartPosition.x;
  const sourceCenterScreenY = connectionStartPosition.y;
  
  // Target always follows mouse position - no snapping
  const targetScreenX = mousePos.x !== 0 ? mousePos.x : sourceCenterScreenX;
  const targetScreenY = mousePos.y !== 0 ? mousePos.y : sourceCenterScreenY;
  
  // Check if hovering over a node for color indication (but don't snap)
  let lineColor = '#3b82f6'; // Blue by default
  
  if (hoveredNodeId && hoveredNodeId !== connectionSourceId) {
    // Check if edge already exists
    const existingEdge = Object.values(edges).find(
      edge => edge.brain_dump_id === currentBrainDumpId &&
              edge.parent_id === connectionSourceId && 
              edge.child_id === hoveredNodeId
    );
    
    if (existingEdge) {
      lineColor = '#ef4444'; // Red for deletion
    } else {
      lineColor = '#10b981'; // Green for new connection
    }
  }
  
  // Start from the center of the source node
  const sourceScreenX = sourceCenterScreenX;
  const sourceScreenY = sourceCenterScreenY;
  
  return (
    <svg 
      className="fixed inset-0 pointer-events-none" 
      style={{ 
        zIndex: 1000,
        width: '100vw',
        height: '100vh',
        top: 0,
        left: 0,
      }}
    >
      <defs>
        <marker
          id="arrowhead-connection"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={lineColor} />
        </marker>
      </defs>
      
      {/* Main connection line */}
      <line
        x1={sourceScreenX}
        y1={sourceScreenY}
        x2={targetScreenX}
        y2={targetScreenY}
        stroke={lineColor}
        strokeWidth={4}
        strokeDasharray="8,4"
        strokeLinecap="round"
        markerEnd="url(#arrowhead-connection)"
      />
    </svg>
  );
}
