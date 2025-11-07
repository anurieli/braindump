'use client'

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { useStore } from '@/store';
import { getThemeTextColor } from '@/lib/themes';
import { getFileTypeCategory } from '@/lib/file-upload';
import { supabase } from '@/lib/supabase';
import type { IdeaDB, Attachment } from '@/types';
import { Paperclip, Move, FileText, Image, FileIcon, Download } from 'lucide-react';

interface AttachmentNodeProps {
  idea: IdeaDB;
  attachment?: Attachment;
}

export default function AttachmentNode({ idea, attachment }: AttachmentNodeProps) {
  const theme = useStore(state => state.theme);
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
  
  const dragStartRef = useRef({ x: 0, y: 0, ideaX: idea.position_x, ideaY: idea.position_y });
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lastClickTimeRef = useRef(0);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  
  const isSelected = selectedIdeaIds.has(idea.id);
  const isConnectionSource = connectionSourceId === idea.id;
  const textColor = getThemeTextColor(theme);
  
  // Force square aspect ratio for attachment nodes
  const size = Math.max(idea.width || 200, idea.height || 200);
  const width = size;
  const height = size;

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

  // Get attachment metadata
  const currentAttachment = attachmentData || attachment;
  const metadata = currentAttachment?.metadata || idea.metadata || {};
  const fileType = currentAttachment?.type || 'file';
  const filename = currentAttachment?.filename || idea.text;
  const mimeType = metadata.mimeType as string;
  const fileCategory = mimeType ? getFileTypeCategory(mimeType) : 'unknown';

  // Keep idea dimensions in sync with rendered size (maintain square)
  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      const measuredWidth = rect.width / viewport.zoom;
      const measuredHeight = rect.height / viewport.zoom;
      
      // Always use the larger dimension to maintain square
      const newSize = Math.max(measuredWidth, measuredHeight);
      const storedSize = Math.max(idea.width ?? newSize, idea.height ?? newSize);
      
      const sizeDiff = Math.abs(newSize - storedSize);

      if (sizeDiff > 0.5) {
        updateIdeaDimensions(idea.id, {
          width: Number(newSize.toFixed(2)),
          height: Number(newSize.toFixed(2)),
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

  const handleFileDownload = useCallback(() => {
    if (currentAttachment?.url) {
      window.open(currentAttachment.url, '_blank');
    }
  }, [currentAttachment?.url]);

  // Render file preview based on type
  const renderFilePreview = () => {
    if (fileCategory === 'image' && currentAttachment?.url) {
      return (
        <div className="w-full h-32 mb-2 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
          {!imageLoaded && !imageError && (
            <div className="animate-pulse bg-gray-200 w-full h-full flex items-center justify-center">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <img
            src={metadata.thumbnailUrl || currentAttachment.url}
            alt={filename}
            className={`max-w-full max-h-full object-cover ${imageLoaded ? 'block' : 'hidden'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          {imageError && (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>
      );
    }

    // File type icons for non-images
    const getFileIcon = () => {
      switch (fileCategory) {
        case 'pdf':
          return <FileText className="h-12 w-12 text-red-500" />;
        case 'document':
          return <FileText className="h-12 w-12 text-blue-500" />;
        default:
          return <FileIcon className="h-12 w-12 text-gray-500" />;
      }
    };

    return (
      <div className="w-full h-32 mb-2 bg-gray-50 rounded flex items-center justify-center">
        {getFileIcon()}
      </div>
    );
  };

  const displayText = idea.text.length > 50 ? idea.text.substring(0, 50) + '...' : idea.text;
  
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
          relative liquid-glass rounded-lg p-3 h-full transition-all hover:shadow-xl
          ${isConnectionSource ? 'ring-2 ring-blue-400' : ''}
        `}
        style={{
          border: isSelected ? '4px solid #3b82f6' : '2px solid rgba(156, 163, 175, 0.5)',
          boxShadow: isSelected ? '0 0 20px rgba(59, 130, 246, 0.6), 0 10px 15px -3px rgba(0, 0, 0, 0.1)' : undefined,
          background: isSelected ? 'rgba(59, 130, 246, 0.05)' : undefined,
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
        
        {/* File Preview */}
        {renderFilePreview()}
        
        {/* File Info */}
        <div className="flex items-center justify-between mb-2">
          <Paperclip className="h-4 w-4 text-gray-500 flex-shrink-0" />
          {currentAttachment?.url && (
            <button
              onClick={handleFileDownload}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Download file"
            >
              <Download className="h-3 w-3 text-gray-500" />
            </button>
          )}
        </div>
        
        {/* Filename */}
        <p className="text-xs font-medium break-words mb-1">{filename}</p>
        
        {/* Description */}
        {idea.text !== filename && (
          <p className="text-xs opacity-75 break-words">{displayText}</p>
        )}
        
        {/* File metadata */}
        {metadata.fileSize && (
          <div className="mt-2 pt-2 border-t border-current/10">
            <p className="text-xs opacity-50">
              {Math.round(metadata.fileSize / 1024)} KB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}