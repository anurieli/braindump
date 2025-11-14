'use client'

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { useStore } from '@/store';
import { getThemeTextColor } from '@/lib/themes';
import type { IdeaDB } from '@/types';
import { Paperclip, Move, MoveDiagonal } from 'lucide-react';
import AttachmentNode from './AttachmentNode';
import { supabase } from '@/lib/supabase';

interface IdeaNodeProps {
  idea: IdeaDB;
}

const GLOW_DURATION_MS = 5000;
const DRAG_THRESHOLD = 5; // pixels

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
  const isCommandKeyPressed = useStore(state => state.isCommandKeyPressed);
  
  // Auto-relate mode state
  const isAutoRelateMode = useStore(state => state.isAutoRelateMode);
  
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
  const showShortcutAssistant = useStore(state => state.showShortcutAssistant);
  const hideShortcutAssistant = useStore(state => state.hideShortcutAssistant);
  const updateIdeaText = useStore(state => state.updateIdeaText);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [glowOpacity, setGlowOpacity] = useState(() => computeInitialGlowOpacity(idea.created_at));
  // Check if this idea is the current drag hover target
  const isDraggedOver = dragHoverTargetId === idea.id;
  const dragStartRef = useRef({ x: 0, y: 0, ideaX: idea.position_x, ideaY: idea.position_y });
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  const isSelected = selectedIdeaIds.has(idea.id);
  const isConnectionSource = connectionSourceId === idea.id;
  const textColor = getThemeTextColor(theme);
  
  // Check if this idea is a parent (has children in relationships)
  const isParent = Object.values(edges).some(
    edge => edge.brain_dump_id === currentBrainDumpId && edge.parent_id === idea.id
  );
  
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
      // Only create/delete edges if Command key is pressed
      if (!isCommandKeyPressed) {
        console.log('⚠️ Connection hover without Command - skipping edge creation');
        return;
      }
      
      // Skip if already touched - we only want to toggle once per drag session
      if (touchedNodesInConnection.has(idea.id)) {
        return;
      }
      
      console.log('✅ Connection hover WITH Command - processing edge');
      
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
  }, [hoveredNodeId, isCreatingConnection, connectionSourceId, idea.id, touchedNodesInConnection, currentBrainDumpId, isCommandKeyPressed]);

  // Display logic: show summary as main text if available, otherwise show original text
  const hasValidSummary = idea.summary && idea.summary.trim().length > 0;
  const mainText = hasValidSummary ? idea.summary ?? '' : idea.text ?? '';
  const displayText = mainText;

  const adjustTextareaSize = useCallback(() => {
    if (editTextareaRef.current) {
      const textarea = editTextareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    if (isEditing) {
      adjustTextareaSize();
    }
  }, [isEditing, editText, adjustTextareaSize]);

  const handleStartEditing = useCallback(() => {
    if (idea.type === 'attachment') return;
    setEditText(idea.text ?? '');
    setIsEditing(true);
  }, [idea.type, idea.text]);

  const handleSaveEdit = useCallback(async () => {
    if (editText.trim() !== (idea.text ?? '')) {
      await updateIdeaText(idea.id, editText.trim(), { skipAI: true });
    }
    setIsEditing(false);
    setEditText('');
  }, [editText, idea.text, updateIdeaText, idea.id]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText('');
  }, []);

  const handleExpandClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectIdea(idea.id);
    openModal('idea-details');
  }, [selectIdea, idea.id, openModal]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't handle if clicking on the connection handle
    if ((e.target as HTMLElement).closest('.connection-handle')) {
      return;
    }
    
    e.stopPropagation();
    if (isEditing) {
      return;
    }
    
    // Handle connection mode
    if (isCreatingConnection && connectionSourceId) {
      if (connectionSourceId !== idea.id) {
        // Connection end is handled by the hover effect
      }
      return;
    }
    
    // Record initial position for drag threshold detection
    // Don't start dragging yet - wait for mouse movement
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ideaX: idea.position_x,
      ideaY: idea.position_y,
    };
    
    // Set mouse down state to trigger drag detection
    setIsMouseDown(true);
    
    // Handle selection immediately on mouse down
    const isMultiSelect = e.metaKey || e.ctrlKey;
    if (isMultiSelect) {
      if (isSelected) {
        // Remove from selection
        const newSelection = Array.from(selectedIdeaIds).filter(id => id !== idea.id);
        setSelection(newSelection);
      } else {
        // Add to selection
        setSelection([...Array.from(selectedIdeaIds), idea.id]);
      }
    } else {
      // For single clicks: only clear selection if clicking on a non-selected node
      // If clicking on an already selected node (part of multi-selection), preserve selection for dragging
      if (isSelected && selectedIdeaIds.size > 1) {
        // This node is already selected as part of a multi-selection - preserve it for bulk drag
        selectIdea(idea.id); // Just update primary selection
      } else {
        // Single select (clear multi-selection)
        selectIdea(idea.id);
        setSelection([idea.id]);
      }
    }
  }, [selectIdea, idea.id, isSelected, selectedIdeaIds, setSelection, isCreatingConnection, connectionSourceId, isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.nativeEvent as MouseEvent).stopImmediatePropagation?.();
    handleStartEditing();
  }, [handleStartEditing]);
  
  // Use document-level mouse events for proper dragging
  useEffect(() => {
    if (!isMouseDown) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;

      let dx = e.clientX - dragStartRef.current.x;
      let dy = e.clientY - dragStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Only start dragging if mouse has moved beyond threshold
      if (!isDragging && distance > DRAG_THRESHOLD) {
        // Start dragging
        setIsDragging(true);
        setDraggedIdeaId(idea.id);
        console.log('🚀 Started dragging idea:', idea.id);
        
        // Show shortcut assistant for edge creation
        console.log('📢 Showing ShortcutAssistant');
        showShortcutAssistant('Hold Command to create edges while you touch them');
        
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
      }
      
      // Rest of the existing mouse move logic...
      // (only execute if actually dragging)
      if (!isDragging) return;
      
      dx = e.clientX - dragStartRef.current.x;
      dy = e.clientY - dragStartRef.current.y;
      
      if (isSelected && selectedIdeaIds.size > 1) {
        // Move all selected nodes together (including the dragged one)
        selectedIdeaIds.forEach(id => {
          const startPos = dragStartPositionsRef.current.get(id);
          if (startPos) {
            const newX = startPos.x + dx;
            const newY = startPos.y + dy;
            updateIdeaPosition(id, { x: newX, y: newY });
          }
        });
      } else {
        // Move just this node
        const newX = dragStartRef.current.ideaX + dx;
        const newY = dragStartRef.current.ideaY + dy;
        updateIdeaPosition(idea.id, { x: newX, y: newY });
      }
      
      // Check if we're dragging over other ideas for immediate edge creation/deletion
      if (draggedIdeaId === idea.id) {
        // Find all idea elements that might be under the mouse cursor
        const elementsUnderMouse = document.elementsFromPoint(e.clientX, e.clientY);
        const ideaElementUnderMouse = elementsUnderMouse.find((el) => {
          const element = el as HTMLElement;
          return element.dataset?.ideaId && element.dataset.ideaId !== idea.id;
        });
        
        if (ideaElementUnderMouse) {
          const targetIdeaId = (ideaElementUnderMouse as HTMLElement).dataset.ideaId;
          const previousTargetId = dragHoverTargetId;
          
          // Only process if we're hovering over a new target AND Command key is pressed
          if (targetIdeaId && targetIdeaId !== previousTargetId) {
            console.log(`🎯 Touch detected: ${idea.id} touching ${targetIdeaId}`);
            
            // Only create/delete edges if Command key is pressed
            if (isCommandKeyPressed) {
              console.log('✅ Command pressed - processing edge creation/deletion');
              // Check if edge already exists
              const existingEdge = Object.values(edges).find(
                edge => edge.brain_dump_id === currentBrainDumpId && 
                        edge.parent_id === idea.id && 
                        edge.child_id === targetIdeaId
              );
              
              if (existingEdge) {
                // Delete existing edge
                deleteEdge(existingEdge.id);
                console.log(`🗑️ Removed edge from ${idea.id} to ${targetIdeaId}`);
              } else {
                // Create new edge
                addEdge(idea.id, targetIdeaId, 'related_to');
                console.log(`✅ Created edge from ${idea.id} to ${targetIdeaId}`);
              }
            }
          }
          
          setDragHoverTargetId(targetIdeaId || null);
        } else {
          setDragHoverTargetId(null);
        }
      }
    };

    const handleDocumentMouseUp = () => {
      setIsMouseDown(false);
      setIsDragging(false);
      
      // Clear drag state if this was the dragged idea (no drop-based edge creation)
      if (draggedIdeaId === idea.id) {
        setDraggedIdeaId(null);
        setDragHoverTargetId(null);
        console.log('🏁 Finished dragging idea:', idea.id);
        
        // Hide shortcut assistant
        hideShortcutAssistant();
      }
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isMouseDown, isDragging, viewport.zoom, idea.id, updateIdeaPosition, isSelected, selectedIdeaIds, draggedIdeaId, dragHoverTargetId, setDraggedIdeaId, setDragHoverTargetId, edges, currentBrainDumpId, addEdge, deleteEdge, isCommandKeyPressed, hideShortcutAssistant, ideas, showShortcutAssistant]);
  
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
    
    // Show ShortcutAssistant with two-part message
    console.log('📢 Showing connection ShortcutAssistant');
    showShortcutAssistant('Hold Command to connect to existing ideas • Let go to create new idea at edge');
  }, [idea.id, startConnection, showShortcutAssistant]);
  
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

  // Check if node is in generating state
  const isGenerating = idea.state === 'generating';

  const baseBorder = isSelected ? '4px solid #3b82f6' // Blue border for selection
    : isDraggedOver ? '3px solid #10b981'
    : isParent ? '2px solid #d97706' 
    : isGenerating ? '3px solid transparent' // Transparent to show gradient behind
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
  const parentShadow = isParent && !isSelected && !isDraggedOver
    ? '0 0 15px rgba(217, 119, 6, 0.4), 0 5px 10px -3px rgba(0, 0, 0, 0.1)'
    : undefined;
  const combinedShadow = [selectionShadow, dragOverShadow, parentShadow, glowShadow].filter(Boolean).join(', ') || undefined;
  
  // Ensure both parent and child nodes have similar backgrounds for consistency
  const isDarkMode = theme === 'dark';
  const baseBackground = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.7)';
  
  const backgroundStyle = isSelected
      ? 'rgba(59, 130, 246, 0.05)' // Blue background for selection
      : isDraggedOver
        ? 'rgba(16, 185, 129, 0.05)'
        : isParent && !isSelected && !isDraggedOver
          ? (isDarkMode ? 'rgba(217, 119, 6, 0.05)' : 'rgba(217, 119, 6, 0.05)')
          : glowOpacity > 0
            ? `rgba(59, 130, 246, ${0.08 * glowOpacity})`
            : baseBackground;

  // URL attachments for text ideas
  const [urlAttachments, setUrlAttachments] = useState<Array<{ id: string; url: string; title?: string; thumbnailUrl?: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (idea.type !== 'text') {
        setUrlAttachments([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('attachments')
          .select('id, url, type, metadata')
          .eq('idea_id', idea.id);
        if (error) throw error;
        if (cancelled) return;
        const urls = (data || [])
          .filter((a: any) => a.type === 'url' && typeof a.url === 'string')
          .map((a: any) => ({
            id: a.id,
            url: a.url as string,
            title: a.metadata?.title as string | undefined,
            thumbnailUrl: (a.metadata?.thumbnailUrl || a.metadata?.previewUrl) as string | undefined,
          }));
        setUrlAttachments(urls);
      } catch {
        if (!cancelled) setUrlAttachments([]);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [idea.id, idea.type]);

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
        // Elevate z-index when selected and especially during drag (including group drag)
        zIndex:
          (draggedIdeaId && (draggedIdeaId === idea.id || selectedIdeaIds.has(idea.id)))
            ? 20
            : (isSelected ? 10 : 1),
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div 
        ref={contentRef}
        className={`
          relative liquid-glass rounded-lg p-3 min-w-[180px] max-w-[280px] transition-all hover:shadow-xl
          ${isConnectionSource ? 'ring-2 ring-blue-400' : ''}
          ${isGenerating ? 'generating-border' : ''}
        `}
        style={{
          border: baseBorder,
          boxShadow: combinedShadow,
          background: backgroundStyle,
          transition: 'box-shadow 120ms linear, background-color 120ms linear, border-color 120ms linear',
        }}
      >
        {/* Connection handle in center */}
        {isHovered && !isEditing && (
          <div
            className="connection-handle absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center z-50 cursor-crosshair hover:scale-110 transition-transform shadow-lg"
            onMouseDown={handleConnectionHandleMouseDown}
            onMouseEnter={(e) => e.stopPropagation()}
          >
            <Move className="h-5 w-5 text-white" />
          </div>
        )}

        {/* Expand button on right side */}
        {isHovered && !isEditing && idea.type === 'text' && (
          <button
            type="button"
            className="expand-handle absolute top-1/2 right-1 -translate-y-1/2 z-50 cursor-pointer p-1 rounded-sm transition-opacity opacity-70 hover:opacity-100"
            style={{
              color: isDarkMode ? 'rgba(229, 231, 235, 0.65)' : 'rgba(55, 65, 81, 0.55)',
            }}
            onClick={handleExpandClick}
            onMouseEnter={(e) => e.stopPropagation()}
            aria-label="Expand idea details"
          >
            <MoveDiagonal className="h-3.5 w-3.5" />
          </button>
        )}
        
        {/* Peek preview (slightly expanded) */}
        {urlAttachments.length > 0 && urlAttachments[0]?.thumbnailUrl && (
          <div className="mb-2 rounded overflow-hidden border border-current/10 h-16">
            <img
              src={urlAttachments[0].thumbnailUrl}
              alt={urlAttachments[0].title || urlAttachments[0].url}
              className="h-full w-full object-cover"
              onClick={(e) => {
                e.stopPropagation()
                try { window.open(urlAttachments[0].url, '_blank') } catch {}
              }}
            />
          </div>
        )}
        {/* Content */}
        {isEditing ? (
          <textarea
            ref={(el) => {
              editTextareaRef.current = el;
              if (el) {
                el.focus();
                el.setSelectionRange(el.value.length, el.value.length);
                adjustTextareaSize();
              }
            }}
            value={editText}
            onChange={(e) => {
              setEditText(e.target.value);
              adjustTextareaSize();
            }}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveEdit();
              } else if (e.key === 'Escape') {
                handleCancelEdit();
              }
            }}
            className="w-full text-sm bg-transparent border-none outline-none resize-none break-words"
            style={{ color: textColor, overflow: 'hidden' }}
            rows={1}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-sm break-words whitespace-pre-wrap" style={{ color: textColor }}>{displayText}</p>
        )}
        {/* URL attachments preview */}
        {urlAttachments.length > 0 && (
          <div className="mt-2 pt-2 border-t border-current/10 space-y-1">
            {urlAttachments.map(att => {
              const href = att.url;
              let host: string | undefined;
              try { host = new URL(href).hostname; } catch {}
              const label = att.title || host || href;
              return (
                <a
                  key={att.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 group"
                  style={{ color: '#3b82f6' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="h-6 w-6 rounded overflow-hidden flex-shrink-0 border border-blue-400/50">
                    {att.thumbnailUrl ? (
                      <img
                        src={att.thumbnailUrl}
                        alt={label}
                        className="h-full w-full object-cover"
                        onError={() => {
                          setUrlAttachments(prev => prev.map(p => p.id === att.id ? { ...p, thumbnailUrl: undefined } : p))
                        }}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-blue-500/10">
                        <Paperclip className="h-3 w-3 text-blue-500" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs truncate group-hover:underline">{label}</span>
                </a>
              );
            })}
          </div>
        )}
        
        {/* Footer: show generating state, summary, or nothing */}
        {isGenerating ? (
          <div className="mt-2 pt-2 border-t border-current/10">
            <p className="text-xs text-purple-400 font-medium">
              generating summary...
            </p>
          </div>
        ) : hasValidSummary ? (
          <div className="mt-2 pt-2 border-t border-current/10">
            <p className="text-xs opacity-50 overflow-hidden" style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              maxHeight: '2.5rem',
              color: textColor
            }}>
              {idea.text.length > 100 ? idea.text.substring(0, 100) + '...' : idea.text}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
