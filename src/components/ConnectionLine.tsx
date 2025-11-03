'use client'

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store/canvas-store';

export default function ConnectionLine() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const connectionSourceId = useStore(state => state.connectionSourceId);
  const isCreatingConnection = useStore(state => state.isCreatingConnection);
  const hoveredNodeId = useStore(state => state.hoveredNodeId);
  const panX = useStore(state => state.panX);
  const panY = useStore(state => state.panY);
  const zoom = useStore(state => state.zoom);
  
  // Use stable selectors to avoid infinite loops
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId);
  const brainDumps = useStore(state => state.brainDumps);
  const currentBrainDump = useMemo(() => {
    return currentBrainDumpId ? brainDumps.get(currentBrainDumpId) || null : null;
  }, [brainDumps, currentBrainDumpId]);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      if (!hasInitialized) {
        setHasInitialized(true);
      }
    };
    
    if (isCreatingConnection && connectionSourceId) {
      // Initialize with current mouse position immediately
      const initMousePos = (e: MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
        setHasInitialized(true);
      };
      
      window.addEventListener('mousemove', handleMouseMove);
      
      // Try to get initial mouse position
      window.addEventListener('mousemove', initMousePos, { once: true });
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        setHasInitialized(false);
      };
    }
  }, [isCreatingConnection, connectionSourceId, hasInitialized]);
  
  // Early return if not creating connection
  if (!isCreatingConnection || !connectionSourceId || !currentBrainDump) {
    return null;
  }
  
  const sourceIdea = currentBrainDump.ideas.get(connectionSourceId);
  if (!sourceIdea) {
    return null;
  }
  
  // Calculate source position in screen coordinates
  const sourceScreenX = sourceIdea.x * zoom + panX;
  const sourceScreenY = sourceIdea.y * zoom + panY;
  
  // Default target is mouse position
  let targetScreenX = mousePos.x || sourceScreenX;
  let targetScreenY = mousePos.y || sourceScreenY;
  let lineColor = '#3b82f6'; // Blue by default
  let showLabel = false;
  let labelText = '';
  
  // If hovering over a different node, snap to it
  if (hoveredNodeId && hoveredNodeId !== connectionSourceId) {
    const targetIdea = currentBrainDump.ideas.get(hoveredNodeId);
    if (targetIdea) {
      targetScreenX = targetIdea.x * zoom + panX;
      targetScreenY = targetIdea.y * zoom + panY;
      
      // Check if edge already exists
      const existingEdge = currentBrainDump.edges.find(
        edge => edge.sourceId === connectionSourceId && edge.targetId === hoveredNodeId
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
