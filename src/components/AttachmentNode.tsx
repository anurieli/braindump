'use client'

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { useStore } from '@/store';
import { getFileTypeCategory } from '@/lib/file-upload';
import { supabase } from '@/lib/supabase';
import type { IdeaDB, Attachment } from '@/types';
import { Move, Image, FileIcon } from 'lucide-react';

interface AttachmentNodeProps {
  idea: IdeaDB;
  attachment?: Attachment;
}

export default function AttachmentNode({ idea, attachment }: AttachmentNodeProps) {
  const selectedIdeaIds = useStore(state => state.selectedIdeaIds);
  const viewport = useStore(state => state.viewport);
  const isCreatingConnection = useStore(state => state.isCreatingConnection);
  const connectionSourceId = useStore(state => state.connectionSourceId);
  const hoveredNodeId = useStore(state => state.hoveredNodeId);
  const touchedNodesInConnection = useStore(state => state.touchedNodesInConnection);
  const edges = useStore(state => state.edges);
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId);
  
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
  
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [attachmentData, setAttachmentData] = useState<Attachment | null>(attachment || null);
  const [loadingAttachment, setLoadingAttachment] = useState(!attachment);
  const [isResizing, setIsResizing] = useState(false);
  
  const dragStartRef = useRef({ x: 0, y: 0, ideaX: idea.position_x, ideaY: idea.position_y });
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lastClickTimeRef = useRef(0);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const resizeStartRef = useRef({ x: 0, y: 0, width: idea.width || 320, height: idea.height || 240 });
  
  const isSelected = selectedIdeaIds.has(idea.id);
  const isConnectionSource = connectionSourceId === idea.id;
  const MIN_DIMENSION = 120;
  const MAX_DIMENSION = 800;

  const clampWidthForAspect = useCallback((targetWidth: number, ratio: number | null) => {
    if (!Number.isFinite(targetWidth) || targetWidth <= 0) {
      return MIN_DIMENSION;
    }

    let widthValue = targetWidth;

    if (ratio && ratio > 0) {
      const maxWidthForHeight = MAX_DIMENSION * ratio;
      if (widthValue > maxWidthForHeight) {
        widthValue = maxWidthForHeight;
      }

      const minWidthForMinHeight = MIN_DIMENSION * ratio;
      if (minWidthForMinHeight <= MAX_DIMENSION) {
        widthValue = Math.max(widthValue, minWidthForMinHeight);
      }
    }

    widthValue = Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, widthValue));
    return widthValue;
  }, [MAX_DIMENSION, MIN_DIMENSION]);

  // Load attachment data if not provided

  const metadata = (attachmentData?.metadata || idea.metadata || {}) as Record<string, unknown> & {
    width?: number;
    height?: number;
    mimeType?: string;
    thumbnailUrl?: string;
  };

  const initialAspectRatio = (() => {
    const metaWidth = typeof metadata.width === 'number' ? metadata.width : undefined;
    const metaHeight = typeof metadata.height === 'number' ? metadata.height : undefined;
    if (metaWidth && metaHeight && metaHeight > 0) {
      return metaWidth / metaHeight;
    }
    if (idea.width && idea.height && idea.height > 0) {
      return idea.width / idea.height;
    }
    return 1;
  })();

  const [aspectRatio, setAspectRatio] = useState<number>(initialAspectRatio);

  useEffect(() => {
    if (!imageLoaded && initialAspectRatio > 0 && Math.abs(initialAspectRatio - aspectRatio) > 0.01 && !isResizing) {
      setAspectRatio(initialAspectRatio);
    }
  }, [initialAspectRatio, aspectRatio, isResizing, imageLoaded]);

  // Load attachment data if not provided
  useEffect(() => {
    if (!attachmentData && loadingAttachment && idea.type === 'attachment') {
      const loadAttachment = async () => {
        try {
          const { data, error } = await supabase
            .from('attachments')
            .select('*')
            .eq('idea_id', idea.id)
            .single();

          if (error) {
            console.error('Failed to load attachment:', error);
          } else if (data) {
            setAttachmentData(data);
          }
        } catch (error) {
          console.error('Error loading attachment:', error);
        } finally {
          setLoadingAttachment(false);
        }
      };

      loadAttachment();
    }
  }, [idea.id, idea.type, attachmentData, loadingAttachment]);

  const currentAttachment = attachmentData || attachment;

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [currentAttachment?.url]);
  const fileType = currentAttachment?.type || 'file';
  const filename = currentAttachment?.filename || idea.text;
  const mimeType = metadata.mimeType;
  const fileCategory = mimeType ? getFileTypeCategory(mimeType) : 'unknown';

  const hasAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0;
  const canResize = fileCategory === 'image' && hasAspectRatio;
  const computedWidth = idea.width ?? clampWidthForAspect(typeof metadata.width === 'number' ? metadata.width : 320, hasAspectRatio ? aspectRatio : 1);
  const fallbackHeight = hasAspectRatio ? computedWidth / aspectRatio : (typeof metadata.height === 'number' ? metadata.height : computedWidth);
  const baseHeight = idea.height ?? fallbackHeight;
  const width = Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, computedWidth));
  const height = canResize && aspectRatio > 0 ? width / aspectRatio : Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, baseHeight));

  // Keep idea dimensions in sync with rendered size (maintain square)
  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      const measuredWidth = rect.width / viewport.zoom;
      const measuredHeight = rect.height / viewport.zoom;
      const widthDiff = Math.abs(measuredWidth - (idea.width ?? measuredWidth));
      const heightDiff = Math.abs(measuredHeight - (idea.height ?? measuredHeight));

      if (!isResizing && (widthDiff > 2 || heightDiff > 2)) {
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
  }, [idea.id, idea.width, idea.height, updateIdeaDimensions, viewport.zoom, isResizing]);
  
  // Handle edge creation/deletion when this node is hovered during connection
  useEffect(() => {
    if (isCreatingConnection && connectionSourceId && hoveredNodeId === idea.id && connectionSourceId !== idea.id) {
      if (touchedNodesInConnection.has(idea.id)) {
        return;
      }
      
      const existingEdge = Object.values(edges).find(
        edge => edge.brain_dump_id === currentBrainDumpId && 
                edge.parent_id === connectionSourceId && 
                edge.child_id === idea.id
      );
      
      if (existingEdge) {
        deleteEdge(existingEdge.id);
      } else {
        addEdge(connectionSourceId, idea.id, 'related_to');
      }
      
      addTouchedNodeInConnection(idea.id);
    }
  }, [hoveredNodeId, isCreatingConnection, connectionSourceId, idea.id, touchedNodesInConnection, currentBrainDumpId]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.connection-handle')) {
      return;
    }
    
    e.stopPropagation();
    
    // Check for double-click
    const now = Date.now();
    if (now - lastClickTimeRef.current < 300) {
      selectIdea(idea.id);
      openModal('idea-details');
      lastClickTimeRef.current = 0;
      return;
    }
    lastClickTimeRef.current = now;
    
    if (isCreatingConnection && connectionSourceId) {
      if (connectionSourceId !== idea.id) {
        // Connection end is handled by the hover effect
      }
      return;
    }
    
    // Start dragging
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ideaX: idea.position_x,
      ideaY: idea.position_y,
    };
    
    // Store initial positions of all selected nodes for group movement
    dragStartPositionsRef.current.clear();
    if (isSelected && selectedIdeaIds.size > 1) {
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
      
      const isGroupMovement = isSelected && selectedIdeaIds.size > 1;
      
      if (isGroupMovement) {
        dragStartPositionsRef.current.forEach((startPos, id) => {
          const newX = startPos.x + dx;
          const newY = startPos.y + dy;
          updateIdeaPosition(id, { x: newX, y: newY });
        });
      } else {
        const newX = dragStartRef.current.ideaX + dx;
        const newY = dragStartRef.current.ideaY + dy;
        updateIdeaPosition(idea.id, { x: newX, y: newY });
      }
    };

    const handleDocumentMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isDragging, viewport.zoom, idea.id, updateIdeaPosition, isSelected, selectedIdeaIds]);
  
  const handleConnectionHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const handleCenterX = rect.left + rect.width / 2;
    const handleCenterY = rect.top + rect.height / 2;
    
    startConnection(idea.id, handleCenterX, handleCenterY);
  }, [idea.id, startConnection]);
  
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (isCreatingConnection && connectionSourceId !== idea.id) {
      setHoveredNodeId(idea.id);
    }
  }, [isCreatingConnection, connectionSourceId, idea.id, setHoveredNodeId]);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (isCreatingConnection && connectionSourceId !== idea.id) {
      setHoveredNodeId(null);
    }
  }, [isCreatingConnection, connectionSourceId, idea.id, setHoveredNodeId]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    if (!canResize) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width,
      height,
    };
  }, [width, height, canResize]);

  useEffect(() => {
    if (!isResizing || !canResize) return;

    const handleResizeMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStartRef.current.x) / viewport.zoom;
      const dy = (e.clientY - resizeStartRef.current.y) / viewport.zoom;
      const diagonalDelta = (dx + dy) / 2;

      const proposedWidth = resizeStartRef.current.width + diagonalDelta;
      const clampedWidth = clampWidthForAspect(proposedWidth, aspectRatio);
      const clampedHeight = clampedWidth / aspectRatio;
      updateIdeaDimensions(idea.id, {
        width: Number(clampedWidth.toFixed(2)),
        height: Number(clampedHeight.toFixed(2)),
      });
    };

    const handleResizeUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeUp);

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeUp);
    };
  }, [isResizing, viewport.zoom, clampWidthForAspect, aspectRatio, idea.id, updateIdeaDimensions, canResize]);

  // Render file preview based on type
  const renderFilePreview = () => {
    if (fileCategory === 'image' && currentAttachment?.url) {
      return (
        <div className="relative w-full h-full overflow-hidden rounded-md">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 animate-pulse bg-gray-200 flex items-center justify-center">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <img
            src={metadata.thumbnailUrl ?? currentAttachment.url}
            alt={filename}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={(event) => {
              setImageLoaded(true);
              setImageError(false);
              const naturalWidth = event.currentTarget.naturalWidth;
              const naturalHeight = event.currentTarget.naturalHeight;
              if (naturalWidth && naturalHeight) {
                const ratio = naturalWidth / naturalHeight;
                setAspectRatio(ratio);
                const clampedWidth = clampWidthForAspect(naturalWidth, ratio);
                const clampedHeight = clampedWidth / ratio;
                const widthDiff = Math.abs((idea.width ?? 0) - clampedWidth);
                const heightDiff = Math.abs((idea.height ?? 0) - clampedHeight);
                if (widthDiff > 2 || heightDiff > 2) {
                  updateIdeaDimensions(idea.id, {
                    width: Number(clampedWidth.toFixed(2)),
                    height: Number(clampedHeight.toFixed(2)),
                  });
                }
              }
            }}
            onError={() => setImageError(true)}
          />
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>
      );
    }

    // File type icons for non-images
    const getFileIcon = () => {
      const baseClass = 'h-12 w-12';
      if (fileCategory === 'pdf') {
        return <FileIcon className={`${baseClass} text-red-500`} />;
      }
      if (fileCategory === 'document') {
        return <FileIcon className={`${baseClass} text-blue-500`} />;
      }
      return <FileIcon className={`${baseClass} text-gray-500`} />;
    };

    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-md">
        {getFileIcon()}
      </div>
    );
  };

  const displayText = idea.text.length > 50 ? idea.text.substring(0, 50) + '...' : idea.text;
  const shouldShowCaption = idea.text && idea.text.trim() !== '' && idea.text.trim() !== filename?.trim();
  const cursorStyle = isResizing ? 'nwse-resize' : isDragging ? 'grabbing' : isHovered ? 'grab' : 'pointer';
  
  return (
    <div
      className="absolute select-none"
      ref={nodeRef}
      style={{
        left: idea.position_x,
        top: idea.position_y,
        width,
        height,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
        cursor: cursorStyle,
        zIndex: 1,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      <div 
        ref={contentRef}
        className={`
          relative liquid-glass rounded-lg h-full transition-all overflow-hidden
          ${isConnectionSource ? 'ring-2 ring-blue-400' : ''}
        `}
        style={{
          border: isSelected ? '4px solid #3b82f6' : '2px solid rgba(156, 163, 175, 0.5)',
          boxShadow: isSelected ? '0 0 20px rgba(59, 130, 246, 0.6), 0 10px 15px -3px rgba(0, 0, 0, 0.1)' : undefined,
          background: isSelected ? 'rgba(59, 130, 246, 0.05)' : undefined,
        }}
      >
        {/* File Preview */}
        {renderFilePreview()}

        {shouldShowCaption && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-3 py-2 truncate">
            {displayText}
          </div>
        )}

        {/* Connection handle in center */}
        {isHovered && (
          <div
            className="connection-handle absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center z-40 cursor-crosshair hover:scale-110 transition-transform shadow-lg"
            onMouseDown={handleConnectionHandleMouseDown}
            onMouseEnter={(e) => e.stopPropagation()}
          >
            <Move className="h-5 w-5 text-white" />
          </div>
        )}

        {/* Resize handle */}
        {canResize && (
          <div
            className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-white/80 border border-gray-300 flex items-center justify-center cursor-nwse-resize shadow-sm"
            onMouseDown={handleResizeMouseDown}
            onMouseEnter={(e) => e.stopPropagation()}
          >
            <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}