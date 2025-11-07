'use client'

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { useStore } from '@/store';
import { getThemeTextColor } from '@/lib/themes';
import type { IdeaDB } from '@/types';
import { Paperclip, Move } from 'lucide-react';
import AttachmentNode from './AttachmentNode';

interface IdeaNodeProps {
  idea: IdeaDB;
}

const GLOW_DURATION_MS = 5000;

const computeInitialGlowOpacity = (createdAt?: string | null) => {
  if (!createdAt) return 0;

  const createdAtMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdAtMs)) {
    return 0;
  }

  const age = Date.now() - createdAtMs;
  if (age >= GLOW_DURATION_MS) return 0;

  return Math.max(0, 1 - age / GLOW_DURATION_MS);
};

export default function IdeaNode({ idea }: IdeaNodeProps) {
  const theme = useStore(state => state.theme);
  const selectedIdeaIds = useStore(state => state.selectedIdeaIds);
  const viewport = useStore(state => state.viewport);
  const isCreatingConnection = useStore(state => state.isCreatingConnection);
  const connectionSourceId = useStore(state => state.connectionSourceId);
  const hoveredNodeId = useStore(state => state.hoveredNodeId);
  const touchedNodesInConnection = useStore(state => state.touchedNodesInConnection);
  const edges = useStore(state => state.edges);
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId);
  const draggedIdeaId = useStore(state => state.draggedIdeaId);
  const dragHoverTargetId = useStore(state => state.dragHoverTargetId);
  
  const updateIdeaPosition = useStore(state => state.updateIdeaPosition);
  const openModal = useStore(state => state.openModal);
  const addToSelection = useStore(state => state.addToSelection);
  const setSelection = useStore(state => state.setSelection);
  const removeFromSelection = useStore(state => state.removeFromSelection);
  const selectIdea = useStore(state => state.selectIdea);
  const ideas = useStore(state => state.ideas);
  const startConnection = useStore(state => state.startConnection);
  const setHoveredNodeId = useStore(state => state.setHoveredNodeId);
  const addTouchedNodeInConnection = useStore(state => state.addTouchedNodeInConnection);
  const addEdge = useStore(state => state.addEdge);
  const updateIdeaDimensions = useStore(state => state.updateIdeaDimensions);
  const deleteEdge = useStore(state => state.deleteEdge);
  const setDraggedIdeaId = useStore(state => state.setDraggedIdeaId);
  const setDragHoverTargetId = useStore(state => state.setDragHoverTargetId);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [glowOpacity, setGlowOpacity] = useState(() => computeInitialGlowOpacity(idea.created_at));
  // Check if this idea is the current drag hover target
  const isDraggedOver = dragHoverTargetId === idea.id;
  const dragStartRef = useRef({ x: 0, y: 0, ideaX: idea.position_x, ideaY: idea.position_y });
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lastClickTimeRef = useRef(0);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  
  const isSelected = selectedIdeaIds.has(idea.id);
  const isConnectionSource = connectionSourceId === idea.id;
  const textColor = getThemeTextColor(theme);
  
  const width = idea.width || 200;
  const height = idea.height || 100;

  useEffect(() => {
    const createdAt = idea.created_at;
    if (!createdAt) {
      setGlowOpacity(0);
      return;
    }

    const createdAtMs = new Date(createdAt).getTime();
    if (Number.isNaN(createdAtMs)) {
      setGlowOpacity(0);
      return;
    }

    let rafId: number | null = null;
    let isCancelled = false;

    const updateGlow = () => {
      const age = Date.now() - createdAtMs;
      if (age >= GLOW_DURATION_MS) {
        if (!isCancelled) {
          setGlowOpacity(0);
        }
        return;
      }

      const nextOpacity = Math.max(0, 1 - age / GLOW_DURATION_MS);
      if (!isCancelled) {
        setGlowOpacity(nextOpacity);
        rafId = requestAnimationFrame(updateGlow);
      }
    };

    const initialAge = Date.now() - createdAtMs;
    if (initialAge >= GLOW_DURATION_MS) {
      setGlowOpacity(0);
    } else {
      setGlowOpacity(Math.max(0, 1 - initialAge / GLOW_DURATION_MS));
      rafId = requestAnimationFrame(updateGlow);
    }

    return () => {
      isCancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [idea.created_at]);

  // Keep idea dimensions in sync with rendered size (accounts for borders, hover effects, etc.)
  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      const measuredWidth = rect.width / viewport.zoom;
      const measuredHeight = rect.height / viewport.zoom;

      const storedWidth = idea.width ?? measuredWidth;
      const storedHeight = idea.height ?? measuredHeight;

      const widthDiff = Math.abs(measuredWidth - storedWidth);
      const heightDiff = Math.abs(measuredHeight - storedHeight);

      if (widthDiff > 0.5 || heightDiff > 0.5) {
        updateIdeaDimensions(idea.id, {
          width: Number(measuredWidth.toFixed(2)),
          height: Number(measuredHeight.toFixed(2)),
        });
      }
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [idea.id, idea.width, idea.height, updateIdeaDimensions, viewport.zoom]);
  
  // Handle edge creation/deletion when this node is hovered during connection
  useEffect(() => {
    // Only process when hoveredNodeId changes (not when edges change)
    // This prevents unwanted edge recreation after deletion
    if (isCreatingConnection && connectionSourceId && hoveredNodeId === idea.id && connectionSourceId !== idea.id) {
      // Skip if already touched - we only want to toggle once per drag session
      if (touchedNodesInConnection.has(idea.id)) {
        return;
      }
      
      // Check if edge already exists at this moment
      const existingEdge = Object.values(edges).find(
        edge => edge.brain_dump_id === currentBrainDumpId && 
                edge.parent_id === connectionSourceId && 
                edge.child_id === idea.id
      );
      
      if (existingEdge) {
        // Delete existing edge
        deleteEdge(existingEdge.id);
      } else {
        // Create new edge (addEdge expects: parentId, childId, type, note?)
        addEdge(connectionSourceId, idea.id, 'related_to');
      }
      
      // Mark this node as touched so we don't toggle again during same drag
      addTouchedNodeInConnection(idea.id);
    }
    // IMPORTANT: Don't include 'edges' in dependencies to prevent recreation after deletion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredNodeId, isCreatingConnection, connectionSourceId, idea.id, touchedNodesInConnection, currentBrainDumpId]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't handle if clicking on the connection handle
    if ((e.target as HTMLElement).closest('.connection-handle')) {
      return;
    }
    
    e.stopPropagation();
    
    // Check for double-click
    const now = Date.now();
    if (now - lastClickTimeRef.current < 300) {
      selectIdea(idea.id); // Set this as the selected idea for the modal
      openModal('idea-details');
      lastClickTimeRef.current = 0;
      return;
    }
    lastClickTimeRef.current = now;
    
    // Handle connection mode
    if (isCreatingConnection && connectionSourceId) {
      if (connectionSourceId !== idea.id) {
        // Connection end is handled by the hover effect
      }
      return;
    }
    
    // Start dragging
    setIsDragging(true);
    setDraggedIdeaId(idea.id);
    console.log('🚀 Started dragging idea:', idea.id);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ideaX: idea.position_x,
      ideaY: idea.position_y,
    };
    
    // Store initial positions of all selected nodes for group movement
    dragStartPositionsRef.current.clear();
    if (isSelected && selectedIdeaIds.size > 1) {
      // Get all ideas for current brain dump
      const allIdeas = Object.values(ideas).filter(
        i => i.brain_dump_id === currentBrainDumpId
      );
      selectedIdeaIds.forEach(id => {
        const selectedIdea = allIdeas.find(i => i.id === id);
        if (selectedIdea) {
          dragStartPositionsRef.current.set(id, {
            x: selectedIdea.position_x,
            y: selectedIdea.position_y,
          });
        }
      });
    } else {
      // Just this node
      dragStartPositionsRef.current.set(idea.id, {
        x: idea.position_x,
        y: idea.position_y,
      });
    }
    
    // Handle selection
    const isMultiSelect = e.metaKey || e.ctrlKey;
    if (isMultiSelect) {
      if (isSelected) {
        removeFromSelection([idea.id]);
      } else {
        addToSelection([idea.id]);
      }
    } else {
      if (!isSelected) {
        setSelection([idea.id]);
      }
    }
  }, [idea.id, idea.position_x, idea.position_y, isSelected, openModal, addToSelection, setSelection, removeFromSelection, selectIdea, selectedIdeaIds, ideas, currentBrainDumpId, isCreatingConnection, connectionSourceId]);
  
  // Use document-level mouse events for proper dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStartRef.current.x) / viewport.zoom;
      const dy = (e.clientY - dragStartRef.current.y) / viewport.zoom;
      
      // Move all selected nodes together
      const isGroupMovement = isSelected && selectedIdeaIds.size > 1;
      
      if (isGroupMovement) {
        // Move all selected nodes by the same delta
        dragStartPositionsRef.current.forEach((startPos, id) => {
          const newX = startPos.x + dx;
          const newY = startPos.y + dy;
          updateIdeaPosition(id, { x: newX, y: newY });
        });
      } else {
        // Move just this node
        const newX = dragStartRef.current.ideaX + dx;
        const newY = dragStartRef.current.ideaY + dy;
        updateIdeaPosition(idea.id, { x: newX, y: newY });
      }
      
      // Check if we're dragging over other ideas for edge creation
      if (draggedIdeaId === idea.id) {
        // Find all idea elements that might be under the mouse cursor
        const elementsUnderMouse = document.elementsFromPoint(e.clientX, e.clientY);
        const ideaElementUnderMouse = elementsUnderMouse.find((el) => {
          const element = el as HTMLElement;
          return element.dataset?.ideaId && element.dataset.ideaId !== idea.id;
        });
        
        if (ideaElementUnderMouse) {
          const targetIdeaId = (ideaElementUnderMouse as HTMLElement).dataset.ideaId;
          console.log(`🎯 Dragging ${idea.id} over ${targetIdeaId}`);
          setDragHoverTargetId(targetIdeaId || null);
        } else {
          setDragHoverTargetId(null);
        }
      }
    };

    const handleDocumentMouseUp = () => {
      setIsDragging(false);
      
      // Check if we're dropping this idea onto another idea for edge creation
      if (draggedIdeaId === idea.id && dragHoverTargetId) {
        const sourceId = draggedIdeaId;
        const targetId = dragHoverTargetId;
        
        // Only create edge if we're dropping onto a different idea
        if (sourceId !== targetId) {
          try {
            // Check if edge already exists before creating
            const existingEdge = Object.values(edges).find(
              edge => edge.brain_dump_id === currentBrainDumpId && 
                      edge.parent_id === sourceId && 
                      edge.child_id === targetId
            );
            
            if (existingEdge) {
              // Delete existing edge
              deleteEdge(existingEdge.id);
              console.log(`🗑️ Deleted edge from ${sourceId} to ${targetId}`);
            } else {
              // Create new edge from source to target
              addEdge(sourceId, targetId, 'related_to');
              console.log(`✅ Created edge from ${sourceId} to ${targetId}`);
            }
          } catch (error) {
            console.error('Failed to create/delete edge:', error);
          }
        }
      }
      
      // Clear drag state if this was the dragged idea
      if (draggedIdeaId === idea.id) {
        setDraggedIdeaId(null);
        setDragHoverTargetId(null);
      }
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isDragging, viewport.zoom, idea.id, updateIdeaPosition, isSelected, selectedIdeaIds, draggedIdeaId, dragHoverTargetId, setDraggedIdeaId, setDragHoverTargetId, edges, currentBrainDumpId, addEdge, deleteEdge]);
  
  const handleConnectionHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Get the actual screen position of the handle center
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const handleCenterX = rect.left + rect.width / 2;
    const handleCenterY = rect.top + rect.height / 2;
    
    // Pass the actual screen position to startConnection
    startConnection(idea.id, handleCenterX, handleCenterY);
  }, [idea.id, startConnection]);
  
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    
    // During connection creation, notify the store that we're hovering this node
    if (isCreatingConnection && connectionSourceId !== idea.id) {
      setHoveredNodeId(idea.id);
    }
    
  }, [isCreatingConnection, connectionSourceId, idea.id, setHoveredNodeId]);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    
    // Clear hover state when leaving during connection creation
    if (isCreatingConnection && connectionSourceId !== idea.id) {
      setHoveredNodeId(null);
    }
    
  }, [isCreatingConnection, connectionSourceId, idea.id, setHoveredNodeId]);
  
  // Display logic: show summary as main text if available, otherwise show original text
  const hasValidSummary = idea.summary && idea.summary.trim().length > 0;
  const mainText = hasValidSummary ? idea.summary ?? '' : idea.text ?? '';
  const displayText = mainText.length > 100 ? mainText.substring(0, 100) + '...' : mainText;

  const baseBorder = isSelected ? '4px solid #3b82f6' 
    : isDraggedOver ? '3px solid #10b981' 
    : '2px solid rgba(156, 163, 175, 0.5)';
  
  const glowShadow = glowOpacity > 0
    ? `0 0 0 4px rgba(59, 130, 246, ${0.18 * glowOpacity}), 0 0 20px rgba(59, 130, 246, ${0.45 * glowOpacity})`
    : undefined;
  const selectionShadow = isSelected
    ? '0 0 20px rgba(59, 130, 246, 0.6), 0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    : undefined;
  const dragOverShadow = isDraggedOver
    ? '0 0 20px rgba(16, 185, 129, 0.6), 0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    : undefined;
  const combinedShadow = [selectionShadow, dragOverShadow, glowShadow].filter(Boolean).join(', ') || undefined;
  
  const backgroundStyle = isSelected
    ? 'rgba(59, 130, 246, 0.05)'
    : isDraggedOver
      ? 'rgba(16, 185, 129, 0.05)'
      : glowOpacity > 0
        ? `rgba(59, 130, 246, ${0.08 * glowOpacity})`
        : undefined;

  // Render AttachmentNode for attachment type ideas
  if (idea.type === 'attachment') {
    return <AttachmentNode idea={idea} />;
  }
  
  return (
    <div
      className="absolute select-none"
      ref={nodeRef}
      data-idea-id={idea.id}
      style={{
        left: idea.position_x,
        top: idea.position_y,
        width,
        height,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
        cursor: isDragging ? 'grabbing' : isHovered ? 'grab' : 'pointer',
        zIndex: 1,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      <div 
        ref={contentRef}
        className={`
          relative liquid-glass rounded-lg p-3 min-w-[180px] max-w-[280px] transition-all hover:shadow-xl
          ${isConnectionSource ? 'ring-2 ring-blue-400' : ''}
        `}
        style={{
          border: baseBorder,
          boxShadow: combinedShadow,
          background: backgroundStyle,
          transition: 'box-shadow 120ms linear, background-color 120ms linear, border-color 120ms linear',
        }}
      >
        {/* Connection handle in center */}
        {isHovered && (
          <div
            className="connection-handle absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center z-50 cursor-crosshair hover:scale-110 transition-transform shadow-lg"
            onMouseDown={handleConnectionHandleMouseDown}
            onMouseEnter={(e) => e.stopPropagation()}
          >
            <Move className="h-5 w-5 text-white" />
          </div>
        )}
        
        {/* Content */}
        <p className="text-sm break-words">{displayText}</p>
        
        {/* Original text preview when summary is shown */}
        {hasValidSummary && (
          <div className="mt-2 pt-2 border-t border-current/10">
            <p className="text-xs opacity-50 overflow-hidden" style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              maxHeight: '2.5rem'
            }}>
              {idea.text.length > 100 ? idea.text.substring(0, 100) + '...' : idea.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
