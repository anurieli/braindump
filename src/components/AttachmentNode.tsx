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
  const draggedIdeaId = useStore(state => state.draggedIdeaId);
  
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
  const updateAttachmentMetadata = useStore(state => state.updateAttachmentMetadata);
  const deleteEdge = useStore(state => state.deleteEdge);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [attachmentData, setAttachmentData] = useState<Attachment | null>(attachment || null);
  const [loadingAttachment, setLoadingAttachment] = useState(!attachment);
  const [isResizing, setIsResizing] = useState(false);
  const [hoveredCorner, setHoveredCorner] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  
  const dragStartRef = useRef({ x: 0, y: 0, ideaX: idea.position_x, ideaY: idea.position_y });
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lastClickTimeRef = useRef(0);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const resizeStartRef = useRef({ 
    x: 0, 
    y: 0, 
    width: idea.width || 320, 
    height: idea.height || 240,
    positionX: idea.position_x,
    positionY: idea.position_y,
    corner: null as string | null
  });
  
  const isSelected = selectedIdeaIds.has(idea.id);
  const isConnectionSource = connectionSourceId === idea.id;
  const MIN_DIMENSION = 120;
  const MAX_DIMENSION = 800;
  const CORNER_SIZE = 20; // Size of corner detection area in pixels

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
    textContent?: string;
    pageCount?: number;
    userPreferences?: {
      width?: number;
      height?: number;
    };
    linkPreview?: {
      title: string;
      description: string;
      image?: string;
      favicon?: string;
    };
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
  const fileCategory: 'image' | 'pdf' | 'text' | 'url' | 'document' | 'unknown' = mimeType ? getFileTypeCategory(mimeType, filename, fileType) : (fileType === 'url' ? 'url' : 'unknown');

  const hasAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0;
  const canResize = (fileCategory === 'image' && hasAspectRatio) || 
                   fileCategory === 'pdf' || 
                   fileCategory === 'text' || 
                   fileCategory === 'url';
  
  // Use user preferences for sizing if available, otherwise fall back to defaults
  const preferredWidth = metadata.userPreferences?.width;
  const preferredHeight = metadata.userPreferences?.height;
  
  const computedWidth = idea.width ?? 
    preferredWidth ?? 
    clampWidthForAspect(typeof metadata.width === 'number' ? metadata.width : 320, hasAspectRatio ? aspectRatio : 1);
  
  const fallbackHeight = hasAspectRatio ? computedWidth / aspectRatio : 
    (preferredHeight ?? (typeof metadata.height === 'number' ? metadata.height : computedWidth));
  
  const baseHeight = idea.height ?? fallbackHeight;
  const width = Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, computedWidth));
  const height = (canResize && hasAspectRatio && fileCategory === 'image') ? 
    width / aspectRatio : 
    Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, baseHeight));

  // Detect which corner the mouse is over
  const detectCorner = useCallback((e: React.MouseEvent | MouseEvent): string | null => {
    if (!contentRef.current || !canResize) return null;
    
    const rect = contentRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const isNearLeft = x < CORNER_SIZE;
    const isNearRight = x > rect.width - CORNER_SIZE;
    const isNearTop = y < CORNER_SIZE;
    const isNearBottom = y > rect.height - CORNER_SIZE;
    
    if (isNearTop && isNearLeft) return 'top-left';
    if (isNearTop && isNearRight) return 'top-right';
    if (isNearBottom && isNearLeft) return 'bottom-left';
    if (isNearBottom && isNearRight) return 'bottom-right';
    
    return null;
  }, [canResize]);

  // Get cursor style for corner
  const getCornerCursor = useCallback((corner: string | null): string => {
    if (!corner) return '';
    switch (corner) {
      case 'top-left':
      case 'bottom-right':
        return 'nwse-resize';
      case 'top-right':
      case 'bottom-left':
        return 'nesw-resize';
      default:
        return '';
    }
  }, []);

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
    
    // Check if we're starting a resize from a corner
    const corner = detectCorner(e);
    if (corner && canResize) {
      e.preventDefault();
      setIsResizing(true);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width,
        height,
        positionX: idea.position_x,
        positionY: idea.position_y,
        corner,
      };
      return;
    }
    
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
  }, [idea.id, idea.position_x, idea.position_y, isSelected, openModal, addToSelection, setSelection, removeFromSelection, selectIdea, selectedIdeaIds, ideas, currentBrainDumpId, isCreatingConnection, connectionSourceId, detectCorner, canResize, width, height]);
  
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
    setHoveredCorner(null);
    if (isCreatingConnection && connectionSourceId !== idea.id) {
      setHoveredNodeId(null);
    }
  }, [isCreatingConnection, connectionSourceId, idea.id, setHoveredNodeId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isResizing || !canResize) return;
    const corner = detectCorner(e);
    setHoveredCorner(corner);
  }, [isResizing, canResize, detectCorner]);

  useEffect(() => {
    if (!isResizing || !canResize || !resizeStartRef.current.corner) return;

    const handleResizeMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStartRef.current.x) / viewport.zoom;
      const dy = (e.clientY - resizeStartRef.current.y) / viewport.zoom;
      const corner = resizeStartRef.current.corner!;
      
      // Calculate scale factor based on corner
      // For all corners, dragging away from the opposite corner increases size
      // The diagonal movement determines the scale change
      // All corners use the same formula: (dx + dy) / 2
      // This works because dragging right+down (both positive) increases size for all corners
      const scaleDelta = (dx + dy) / 2;
      
      const proposedWidth = resizeStartRef.current.width + scaleDelta * 2;
      const proposedHeight = resizeStartRef.current.height + scaleDelta * 2;
      
      let clampedWidth: number;
      let clampedHeight: number;
      
      if (hasAspectRatio && fileCategory === 'image') {
        // Use aspect ratio for images
        clampedWidth = clampWidthForAspect(proposedWidth, aspectRatio);
        clampedHeight = clampedWidth / aspectRatio;
      } else {
        // Free-form resizing for PDFs, text files, and URLs
        clampedWidth = Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, proposedWidth));
        clampedHeight = Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, proposedHeight));
      }
      
      // Calculate position adjustment to keep opposite corner fixed
      const widthDelta = clampedWidth - resizeStartRef.current.width;
      const heightDelta = clampedHeight - resizeStartRef.current.height;
      
      let newPositionX = resizeStartRef.current.positionX;
      let newPositionY = resizeStartRef.current.positionY;
      
      // Adjust position based on which corner is being dragged
      // The opposite corner stays fixed
      switch (corner) {
        case 'top-left':
          // Bottom-right stays fixed, so move top-left
          newPositionX = resizeStartRef.current.positionX - widthDelta / 2;
          newPositionY = resizeStartRef.current.positionY - heightDelta / 2;
          break;
        case 'top-right':
          // Bottom-left stays fixed, so move top-right
          newPositionX = resizeStartRef.current.positionX + widthDelta / 2;
          newPositionY = resizeStartRef.current.positionY - heightDelta / 2;
          break;
        case 'bottom-left':
          // Top-right stays fixed, so move bottom-left
          newPositionX = resizeStartRef.current.positionX - widthDelta / 2;
          newPositionY = resizeStartRef.current.positionY + heightDelta / 2;
          break;
        case 'bottom-right':
          // Top-left stays fixed, so move bottom-right
          newPositionX = resizeStartRef.current.positionX + widthDelta / 2;
          newPositionY = resizeStartRef.current.positionY + heightDelta / 2;
          break;
      }
      
      updateIdeaDimensions(idea.id, {
        width: Number(clampedWidth.toFixed(2)),
        height: Number(clampedHeight.toFixed(2)),
      });
      
      updateIdeaPosition(idea.id, {
        x: Number(newPositionX.toFixed(2)),
        y: Number(newPositionY.toFixed(2)),
      });
    };

    const handleResizeUp = () => {
      setIsResizing(false);
      setHoveredCorner(null);
      
      // Save user preferences for this attachment size
      if (idea.type === 'attachment') {
        const currentWidth = idea.width;
        const currentHeight = idea.height;
        
        if (currentWidth && currentHeight) {
          updateAttachmentMetadata(idea.id, {
            userPreferences: {
              width: currentWidth,
              height: currentHeight
            }
          });
        }
      }
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeUp);

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeUp);
    };
  }, [isResizing, viewport.zoom, clampWidthForAspect, aspectRatio, idea.id, updateIdeaDimensions, updateIdeaPosition, canResize, updateAttachmentMetadata]);

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
            draggable={false}
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
            onDragStart={(e) => e.preventDefault()}
          />
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>
      );
    }

    // Text file content preview
    if (fileCategory === 'text' && metadata.textContent) {
      return (
        <div className="w-full h-full p-3 bg-gray-50 rounded-md overflow-hidden">
          <div className="h-full flex flex-col">
            {/* File type indicator */}
            <div className="flex items-center gap-2 mb-2 flex-shrink-0">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600 truncate font-medium">
                {filename?.split('.').pop()?.toUpperCase() || 'TEXT'}
              </span>
            </div>
            
            {/* Text content */}
            <div className="flex-1 overflow-hidden">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words leading-relaxed font-mono">
                {metadata.textContent}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    // PDF preview (with thumbnail or fallback representation)
    if (fileCategory === 'pdf') {
      // Debug logging
      console.log('🔍 PDF Debug Info:', {
        filename,
        fileCategory,
        thumbnailUrl: metadata.thumbnailUrl,
        thumbnailError,
        mimeType,
        metadata: metadata
      });
      
      return (
        <div className="w-full h-full bg-gray-50 rounded-md overflow-hidden">
          <div className="relative w-full h-full">
            {/* PDF content - show thumbnail if available, otherwise create a document representation */}
            {metadata.thumbnailUrl && !thumbnailError ? (
              <div className="absolute inset-0">
                <img
                  src={metadata.thumbnailUrl}
                  alt={`PDF: ${filename}`}
                  draggable={false}
                  className="w-full h-full object-contain"
                  onError={() => {
                    console.warn('PDF thumbnail failed to load, showing fallback')
                    setThumbnailError(true)
                  }}
                  onDragStart={(e) => e.preventDefault()}
                />
              </div>
            ) : (
              /* Fallback PDF representation */
              <div className="absolute inset-0 p-4">
                {/* Document background */}
                <div className="w-full h-full bg-white rounded shadow-lg border border-gray-200 relative overflow-hidden">
                  {/* Document lines to simulate content */}
                  <div className="p-6 space-y-2">
                    {[...Array(Math.floor((height - 120) / 16))].map((_, i) => (
                      <div key={i} className="flex space-x-1">
                        <div className="h-2 bg-gray-300 rounded flex-1" style={{
                          width: `${Math.random() * 40 + 60}%`
                        }}></div>
                      </div>
                    ))}
                  </div>
                  
                  {/* PDF watermark */}
                  <div className="absolute bottom-4 right-4 text-gray-400 text-xs font-mono transform rotate-12">
                    PDF DOCUMENT
                  </div>
                </div>
              </div>
            )}
            
            {/* PDF indicator overlay */}
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg font-medium">
              PDF
            </div>
            
            {/* Page count indicator if available */}
            {metadata.pageCount && metadata.pageCount > 1 && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded shadow-lg">
                {metadata.pageCount} pages
              </div>
            )}
            
            {/* File name indicator */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent text-white text-xs px-3 py-2 truncate">
              {filename}
            </div>
          </div>
        </div>
      );
    }

    // Web link preview
    if (fileCategory === 'url' && metadata.linkPreview) {
      const linkPreview = metadata.linkPreview;
      const hasImage = linkPreview.image && linkPreview.image.trim() !== '';

      return (
        <div 
          className="w-full h-full bg-white rounded-md overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            window.open(currentAttachment?.url || '', '_blank');
          }}
        >
          <div className="relative w-full h-full flex flex-col">
            {/* Website image if available */}
            {hasImage && (
              <div className="flex-shrink-0 h-2/3 bg-gray-100">
                <img
                  src={linkPreview.image}
                  alt={linkPreview.title}
                  draggable={false}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Hide image container if it fails to load
                    const imgElement = e.target as HTMLImageElement;
                    const container = imgElement.parentElement;
                    if (container) {
                      container.style.display = 'none';
                    }
                  }}
                  onDragStart={(e) => e.preventDefault()}
                />
              </div>
            )}
            
            {/* Content area */}
            <div className={`flex-1 p-2 flex flex-col ${hasImage ? 'h-1/3' : 'h-full'}`}>
              {/* Header with favicon and title */}
              <div className="flex items-start gap-2 mb-1">
                {linkPreview.favicon && (
                  <img
                    src={linkPreview.favicon}
                    alt=""
                    className="w-4 h-4 flex-shrink-0 mt-0.5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">
                  {linkPreview.title || 'Untitled'}
                </h3>
              </div>
              
              {/* Description */}
              {linkPreview.description && (
                <p className="text-xs text-gray-600 line-clamp-2 leading-tight">
                  {linkPreview.description}
                </p>
              )}
              
              {/* URL indicator */}
              <div className="mt-auto pt-1">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-gray-500 truncate">
                    {(() => {
                      try {
                        return new URL(currentAttachment?.url || '').hostname;
                      } catch {
                        return currentAttachment?.url || 'URL';
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // File type icons for files without content preview
    const getFileIcon = () => {
      const baseClass = 'h-12 w-12';
      if (fileCategory === 'text') {
        return <FileIcon className={`${baseClass} text-green-500`} />;
      }
      if (fileCategory === 'url') {
        return <FileIcon className={`${baseClass} text-blue-500`} />;
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
  
  // Determine cursor style
  const getCursorStyle = () => {
    if (isResizing && resizeStartRef.current.corner) {
      return getCornerCursor(resizeStartRef.current.corner);
    }
    if (hoveredCorner && canResize) {
      return getCornerCursor(hoveredCorner);
    }
    if (isDragging) return 'grabbing';
    if (isHovered) return 'grab';
    return 'pointer';
  };
  
  const cursorStyle = getCursorStyle();
  
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
        // Elevate when selected; if dragging this or group dragging, keep on top
        zIndex:
          (isDragging || (draggedIdeaId && (draggedIdeaId === idea.id || selectedIdeaIds.has(idea.id))))
            ? 20
            : (isSelected ? 10 : 1),
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
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
        {isHovered && !hoveredCorner && (
          <div
            className="connection-handle absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center z-40 cursor-crosshair hover:scale-110 transition-transform shadow-lg"
            onMouseDown={handleConnectionHandleMouseDown}
            onMouseEnter={(e) => e.stopPropagation()}
          >
            <Move className="h-5 w-5 text-white" />
          </div>
        )}

        {/* Resize handles in corners - show when hovering and can resize */}
        {isHovered && canResize && (
          <>
            {/* Top-left corner */}
            <div
              className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize z-50 transition-opacity"
              style={{ opacity: hoveredCorner === 'top-left' ? 1 : 0.7 }}
            />
            {/* Top-right corner */}
            <div
              className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize z-50 transition-opacity"
              style={{ opacity: hoveredCorner === 'top-right' ? 1 : 0.7 }}
            />
            {/* Bottom-left corner */}
            <div
              className="absolute -bottom-1 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize z-50 transition-opacity"
              style={{ opacity: hoveredCorner === 'bottom-left' ? 1 : 0.7 }}
            />
            {/* Bottom-right corner */}
            <div
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize z-50 transition-opacity"
              style={{ opacity: hoveredCorner === 'bottom-right' ? 1 : 0.7 }}
            />
          </>
        )}
      </div>
    </div>
  );
}