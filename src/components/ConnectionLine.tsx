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
  
  // Default target is mouse position (or source if mouse hasn't moved yet)
  let targetScreenX = mousePos.x !== 0 ? mousePos.x : sourceCenterScreenX;
  let targetScreenY = mousePos.y !== 0 ? mousePos.y : sourceCenterScreenY;
  let lineColor = '#3b82f6'; // Blue by default
  let showLabel = false;
  let labelText = '';
  let targetCenterScreenX = targetScreenX;
  let targetCenterScreenY = targetScreenY;
  
  // If hovering over a different node, snap to it
  if (hoveredNodeId && hoveredNodeId !== connectionSourceId) {
    const targetIdea = ideas[hoveredNodeId];
    if (targetIdea) {
      targetCenterScreenX = targetIdea.position_x * viewport.zoom + viewport.x;
      targetCenterScreenY = targetIdea.position_y * viewport.zoom + viewport.y;
      targetScreenX = targetCenterScreenX;
      targetScreenY = targetCenterScreenY;
      
      // Check if edge already exists (check both directions)
      const existingEdge = Object.values(edges).find(
        edge => edge.brain_dump_id === currentBrainDumpId &&
                edge.parent_id === connectionSourceId && 
                edge.child_id === hoveredNodeId
      );
      
      if (existingEdge) {
        lineColor = '#ef4444'; // Red for deletion
        showLabel = false;
      } else {
        lineColor = '#3b82f6'; // Blue for creation
        showLabel = true;
        labelText = 'new edge';
      }
    }
  }
  
  // Start from the center of the source node (will be behind the node visually)
  const sourceScreenX = sourceCenterScreenX;
  const sourceScreenY = sourceCenterScreenY;
  
  const dx = targetScreenX - sourceCenterScreenX;
  const dy = targetScreenY - sourceCenterScreenY;
  
  // If hovering over a node, also calculate edge intersection for target
  if (hoveredNodeId && hoveredNodeId !== connectionSourceId) {
    const targetIdea = ideas[hoveredNodeId];
    if (targetIdea) {
      const targetWidth = (targetIdea.width || 200) * viewport.zoom;
      const targetHeight = (targetIdea.height || 100) * viewport.zoom;
      const targetHalfWidth = targetWidth / 2;
      const targetHalfHeight = targetHeight / 2;
      
      const angle = Math.atan2(dy, dx);
      const tanAngle = Math.tan(angle);
      
      if (Math.abs(tanAngle) < targetHalfHeight / targetHalfWidth) {
        // Intersects left or right edge of target
        targetScreenX = targetCenterScreenX - (dx > 0 ? targetHalfWidth : -targetHalfWidth);
        targetScreenY = targetCenterScreenY + (targetScreenX - targetCenterScreenX) * tanAngle;
      } else {
        // Intersects top or bottom edge of target
        targetScreenY = targetCenterScreenY - (dy > 0 ? targetHalfHeight : -targetHalfHeight);
        targetScreenX = targetCenterScreenX + (targetScreenY - targetCenterScreenY) / tanAngle;
      }
    }
  }
  
  const midX = (sourceScreenX + targetScreenX) / 2;
  const midY = (sourceScreenY + targetScreenY) / 2;
  
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
      
      {/* Label when hovering over target */}
      {showLabel && (
        <g>
          <rect
            x={midX - 35}
            y={midY - 12}
            width={70}
            height={24}
            fill="white"
            stroke={lineColor}
            strokeWidth={2}
            rx={4}
            opacity={0.95}
          />
          <text
            x={midX}
            y={midY + 5}
            textAnchor="middle"
            fill={lineColor}
            fontSize={12}
            fontWeight={500}
          >
            {labelText}
          </text>
        </g>
      )}
      
      {/* Circle at cursor when not hovering over a node */}
      {!hoveredNodeId && (
        <circle
          cx={targetScreenX}
          cy={targetScreenY}
          r={8}
          fill={lineColor}
          opacity={0.5}
        />
      )}
    </svg>
  );
}
