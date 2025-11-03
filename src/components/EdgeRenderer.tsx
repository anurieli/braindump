'use client'

import { useMemo, useCallback } from 'react';
import { useStore } from '@/store';
import { getThemeTextColor } from '@/lib/themes';
import { nearestPointOnRect } from '@/lib/geometry';

export default function EdgeRenderer() {
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId);
  const edges = useStore(state => state.edges);
  const ideas = useStore(state => state.ideas);
  const selectedIdeaIds = useStore(state => state.selectedIdeaIds);
  const selectedEdgeIds = useStore(state => state.selectedEdgeIds);
  const theme = useStore(state => state.theme);
  const viewport = useStore(state => state.viewport);
  const connectionSourceId = useStore(state => state.connectionSourceId);
  const hoveredNodeId = useStore(state => state.hoveredNodeId);
  const toggleEdgeSelection = useStore(state => state.toggleEdgeSelection);
  const deleteEdge = useStore(state => state.deleteEdge);
  
  // Filter edges by current brain dump
  const filteredEdges = useMemo(() => {
    if (!currentBrainDumpId) return [];
    return Object.values(edges).filter(
      edge => edge.brain_dump_id === currentBrainDumpId
    );
  }, [edges, currentBrainDumpId]);
  
  // Handle edge click
  const handleEdgeClick = useCallback((e: React.MouseEvent, edgeId: string) => {
    console.log('🔵 Edge clicked:', edgeId);
    e.stopPropagation();
    e.preventDefault();
    const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;
    
    // Check if Delete/Backspace key is being held
    if ((e as any).nativeEvent?.shiftKey && selectedEdgeIds.has(edgeId)) {
      console.log('🗑️ Deleting edge (shift+click):', edgeId);
      deleteEdge(edgeId);
      return;
    }
    
    console.log('Toggling edge selection:', edgeId, 'multi:', isMultiSelect);
    toggleEdgeSelection(edgeId, isMultiSelect);
  }, [toggleEdgeSelection, deleteEdge, selectedEdgeIds]);

  // Handle edge double click - delete
  const handleEdgeDoubleClick = useCallback((e: React.MouseEvent, edgeId: string) => {
    console.log('🔵🔵 Edge double-clicked (deleting):', edgeId);
    e.stopPropagation();
    e.preventDefault();
    deleteEdge(edgeId);
  }, [deleteEdge]);
  
  if (!currentBrainDumpId || filteredEdges.length === 0) return null;
  
  const textColor = getThemeTextColor(theme);
  const strokeColor = textColor === '#ffffff' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)';
  
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'visible',
        zIndex: 0,
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={strokeColor} />
        </marker>
        <marker
          id="arrowhead-selected"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
        </marker>
        <marker
          id="arrowhead-remove"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
        </marker>
      </defs>
      
      {filteredEdges.map(edge => {
        const sourceIdea = ideas[edge.parent_id];
        const targetIdea = ideas[edge.child_id];
        
        if (!sourceIdea || !targetIdea) return null;
        
        const isEdgeSelected = selectedEdgeIds.has(edge.id);
        const isNodeSelected = selectedIdeaIds.has(edge.parent_id) || selectedIdeaIds.has(edge.child_id);
        const isSelected = isEdgeSelected || isNodeSelected;
        
        // Check if this edge would be removed (red highlight)
        const willBeRemoved = connectionSourceId && 
                            hoveredNodeId &&
                            edge.parent_id === connectionSourceId && 
                            edge.child_id === hoveredNodeId;
        
        // Node centers (position_x and position_y are centers due to transform: translate(-50%, -50%))
        const sourceCenterX = sourceIdea.position_x;
        const sourceCenterY = sourceIdea.position_y;
        const targetCenterX = targetIdea.position_x;
        const targetCenterY = targetIdea.position_y;
        
        // Calculate node dimensions
        const sourceWidth = sourceIdea.width || 200;
        const sourceHeight = sourceIdea.height || 100;
        const targetWidth = targetIdea.width || 200;
        const targetHeight = targetIdea.height || 100;
        
        // Calculate the direction vector from source to target
        const dx = targetCenterX - sourceCenterX;
        const dy = targetCenterY - sourceCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return null; // Avoid division by zero
        
        const sourceRect = {
          x: sourceCenterX - sourceWidth / 2,
          y: sourceCenterY - sourceHeight / 2,
          width: sourceWidth,
          height: sourceHeight,
        };

        const targetRect = {
          x: targetCenterX - targetWidth / 2,
          y: targetCenterY - targetHeight / 2,
          width: targetWidth,
          height: targetHeight,
        };

        const { x: sourceX, y: sourceY } = nearestPointOnRect(
          { x: targetCenterX, y: targetCenterY },
          sourceRect
        );

        const { x: targetX, y: targetY } = nearestPointOnRect(
          { x: sourceCenterX, y: sourceCenterY },
          targetRect
        );
        
        // Calculate midpoint for label (use edge intersection points)
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;
        
        const lineColor = willBeRemoved ? '#ef4444' : (isSelected ? '#3b82f6' : strokeColor);
        const lineWidth = willBeRemoved ? 4 : (isSelected ? 4 : 2);
        const marker = willBeRemoved ? 'url(#arrowhead-remove)' : (isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)');
        const glowFilter = isSelected ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.8))' : 'none';
        
        return (
          <g key={edge.id}>
            {/* Visible straight line from source edge to target edge */}
            <line
              x1={sourceX}
              y1={sourceY}
              x2={targetX}
              y2={targetY}
              stroke={lineColor}
              strokeWidth={lineWidth}
              markerEnd={marker}
              className={`pointer-events-none ${willBeRemoved ? 'animate-pulse' : ''}`}
              style={{ filter: glowFilter }}
            />
            
            {/* Relationship type label */}
            {edge.type && (
              <g className="pointer-events-none">
                <rect
                  x={midX - 40}
                  y={midY - 12}
                  width="80"
                  height="24"
                  rx="12"
                  fill={willBeRemoved ? '#fee2e2' : (isSelected ? '#dbeafe' : 'white')}
                  stroke={lineColor}
                  strokeWidth={isSelected ? '2' : '1'}
                />
                <text
                  x={midX}
                  y={midY + 5}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={willBeRemoved ? 'bold' : (isSelected ? 'semibold' : 'normal')}
                  fill={willBeRemoved ? '#ef4444' : (isSelected ? '#3b82f6' : '#374151')}
                  className="select-none"
                >
                  {edge.type}
                </text>
              </g>
            )}
            
            {/* Invisible wider line for easier clicking - MUST be last to be on top */}
            <line
              x1={sourceX}
              y1={sourceY}
              x2={targetX}
              y2={targetY}
              stroke="transparent"
              strokeWidth="20"
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => handleEdgeClick(e, edge.id)}
              onDoubleClick={(e) => handleEdgeDoubleClick(e, edge.id)}
            />
          </g>
        );
      })}
    </svg>
  );
}
