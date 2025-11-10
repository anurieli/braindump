'use client'

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '@/store';
import { getThemeBackground } from '@/lib/themes';
import { screenToCanvas, rectsIntersect, lineIntersectsRect } from '@/lib/geometry';
import { validateFile, uploadFile } from '@/lib/file-upload';
import IdeaNode from './IdeaNode';
import EdgeRenderer from './EdgeRenderer';
import ConnectionLine from './ConnectionLine';
import DetailModal from './DetailModal';
import BatchActions from './BatchActions';
import FileDropModal from './FileDropModal';
import QuickIdeaInput from './QuickIdeaInput';
import ShortcutAssistant from './ShortcutAssistant';
import type { InputBoxHandle } from './InputBox';

interface CanvasProps {
  inputBoxRef?: React.RefObject<InputBoxHandle>
}

export default function Canvas({ inputBoxRef }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Use stable selectors to avoid infinite loops
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId);
  const brainDumps = useStore(state => state.brainDumps);
  const currentBrainDump = useMemo(() => {
    return brainDumps.find(bd => bd.id === currentBrainDumpId) || null;
  }, [brainDumps, currentBrainDumpId]);
  
  const viewport = useStore(state => state.viewport);
  // Use theme from current brain dump if available, otherwise use global theme
  const globalTheme = useStore(state => state.theme);
  const theme = useMemo(() => {
    // Use brain dump's theme if available (brain dumps from DB have theme field)
    // Type assertion needed because BrainDump type doesn't include theme, but BrainDumpDB does
    const brainDumpTheme = (currentBrainDump as any)?.theme;
    return brainDumpTheme || globalTheme;
  }, [globalTheme, currentBrainDump]);
  const isGridVisible = useStore(state => state.isGridVisible);
  const selectionBox = useStore(state => state.selectionBox);
  const isPanning = useStore(state => state.isPanning);
  const isSelecting = useStore(state => state.isSelecting);
  const selectedIdeaIds = useStore(state => state.selectedIdeaIds);
  const selectedEdgeIds = useStore(state => state.selectedEdgeIds);
  
  const updateViewport = useStore(state => state.updateViewport);
  const setSelecting = useStore(state => state.setSelecting);
  const setSelectionBox = useStore(state => state.setSelectionBox);
  const clearSelection = useStore(state => state.clearSelection);
  const setPanning = useStore(state => state.setPanning);
  const setSelection = useStore(state => state.setSelection);
  const setEdgeSelection = useStore(state => state.setEdgeSelection);
  const deleteEdge = useStore(state => state.deleteEdge);
  const edges = useStore(state => state.edges);
  
  // Quick editor state
  const showQuickEditor = useStore(state => state.showQuickEditor);
  
  // Connection handling state
  const isCreatingConnection = useStore(state => state.isCreatingConnection);
  const cancelConnection = useStore(state => state.cancelConnection);
  
  // Shortcut assistant state
  const shortcutAssistant = useStore(state => state.shortcutAssistant);
  
  // Command key state
  const setCommandKeyPressed = useStore(state => state.setCommandKeyPressed);
  
  // Directly access ideas object and memoize to avoid infinite loop
  // Filter ideas by current brain dump ID
  const ideasObject = useStore(state => state.ideas);
  const ideas = useMemo(() => {
    if (!currentBrainDumpId) return [];
    return Object.values(ideasObject).filter(
      idea => idea.brain_dump_id === currentBrainDumpId
    );
  }, [ideasObject, currentBrainDumpId]);
  
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const isBoxSelectingRef = useRef(false);
  const spacePressedRef = useRef(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverPosition, setDragOverPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingFile, setPendingFile] = useState<{ file: File; position: { x: number; y: number } } | null>(null);

  const baseGridSize = 40;
  const scaledGridSize = baseGridSize * viewport.zoom;

  const gridStyle: CSSProperties = {
    backgroundSize: `${scaledGridSize}px ${scaledGridSize}px, ${scaledGridSize}px ${scaledGridSize}px`,
    backgroundPosition: `${viewport.x}px ${viewport.y}px, ${viewport.x}px ${viewport.y}px`,
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track Command/Meta key
      if (e.metaKey) {
        setCommandKeyPressed(true);
      }
      
      if (e.code === 'Space') {
        const target = e.target as HTMLElement | null;
        const isInputElement = target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.getAttribute('contenteditable') === 'true'
        );
        if (!isInputElement) {
          spacePressedRef.current = true;
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Track Command/Meta key
      if (!e.metaKey) {
        setCommandKeyPressed(false);
      }
      
      if (e.code === 'Space') {
        spacePressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setCommandKeyPressed]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!currentBrainDump) return;

    const shouldPan =
      e.button === 1 ||
      (e.button === 0 && (e.altKey || e.metaKey || spacePressedRef.current));

    if (shouldPan) {
      // Middle mouse, Alt+Left mouse, or Space+Left mouse = pan
      isPanningRef.current = true;
      setPanning(true);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }

    if (e.button === 0) {
      // Left mouse on canvas = box selection
      const rect = canvasRef.current!.getBoundingClientRect();
      const canvasPoint = screenToCanvas(
        e.clientX - rect.left,
        e.clientY - rect.top,
        viewport.x,
        viewport.y,
        viewport.zoom
      );
      isBoxSelectingRef.current = true;
      setSelecting(true);
      setSelectionBox({
        startX: canvasPoint.x,
        startY: canvasPoint.y,
        endX: canvasPoint.x,
        endY: canvasPoint.y,
      });
      if (!e.shiftKey && !e.metaKey) {
        clearSelection();
      }
    }
  }, [viewport, currentBrainDump, setPanning, setSelecting, setSelectionBox, clearSelection]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!currentBrainDump) return;

    if (isPanningRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      updateViewport({
        x: viewport.x + dx,
        y: viewport.y + dy,
        zoom: viewport.zoom
      });
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    } else if (isBoxSelectingRef.current && canvasRef.current && selectionBox) {
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasPoint = screenToCanvas(
        e.clientX - rect.left,
        e.clientY - rect.top,
        viewport.x,
        viewport.y,
        viewport.zoom
      );
      const updatedBox = {
        ...selectionBox,
        endX: canvasPoint.x,
        endY: canvasPoint.y,
      };
      setSelectionBox(updatedBox);

      // Real-time selection: check which nodes and edges intersect with selection box
      const selectionRect = {
        x: Math.min(updatedBox.startX, updatedBox.endX),
        y: Math.min(updatedBox.startY, updatedBox.endY),
        width: Math.abs(updatedBox.endX - updatedBox.startX),
        height: Math.abs(updatedBox.endY - updatedBox.startY),
      };

      // Select nodes that intersect with selection box
      // Note: nodes are centered at their position (transform: translate(-50%, -50%))
      const selectedNodeIds: string[] = [];
      ideas.forEach(idea => {
        const nodeWidth = idea.width || 200;
        const nodeHeight = idea.height || 100;
        const ideaRect = {
          x: idea.position_x - nodeWidth / 2,
          y: idea.position_y - nodeHeight / 2,
          width: nodeWidth,
          height: nodeHeight,
        };
        if (rectsIntersect(selectionRect, ideaRect)) {
          selectedNodeIds.push(idea.id);
        }
      });

      // Select edges that intersect with selection box
      const selectedEdgeIds: string[] = [];
      const filteredEdges = Object.values(edges).filter(
        edge => edge.brain_dump_id === currentBrainDumpId
      );
      filteredEdges.forEach(edge => {
        const sourceIdea = ideas.find(i => i.id === edge.parent_id);
        const targetIdea = ideas.find(i => i.id === edge.child_id);
        
        if (sourceIdea && targetIdea) {
          const sourceX = sourceIdea.position_x + (sourceIdea.width || 200) / 2;
          const sourceY = sourceIdea.position_y + (sourceIdea.height || 100) / 2;
          const targetX = targetIdea.position_x + (targetIdea.width || 200) / 2;
          const targetY = targetIdea.position_y + (targetIdea.height || 100) / 2;

          if (lineIntersectsRect(
            sourceX,
            sourceY,
            targetX,
            targetY,
            selectionRect.x,
            selectionRect.y,
            selectionRect.width,
            selectionRect.height
          )) {
            selectedEdgeIds.push(edge.id);
          }
        }
      });

      // Update selections in real-time
      setSelection(selectedNodeIds);
      setEdgeSelection(selectedEdgeIds);
    }
  }, [viewport, updateViewport, selectionBox, setSelectionBox, currentBrainDump, currentBrainDumpId, ideas, edges, setSelection, setEdgeSelection]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setPanning(false);
    }
    if (isBoxSelectingRef.current) {
      isBoxSelectingRef.current = false;
      setSelecting(false);
      setSelectionBox(null);
    }
  }, [setPanning, setSelecting, setSelectionBox]);

  // Handle drag and drop for files
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentBrainDump) return;
    
    // Check if drag contains files
    const hasFiles = e.dataTransfer?.types.includes('Files');
    if (hasFiles) {
      setIsDragOver(true);
      
      // Calculate drop position in canvas coordinates
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const canvasPoint = screenToCanvas(
          e.clientX - rect.left,
          e.clientY - rect.top,
          viewport.x,
          viewport.y,
          viewport.zoom
        );
        setDragOverPosition(canvasPoint);
      }
    }
  }, [currentBrainDump, viewport]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear drag state if leaving the canvas entirely
    if (!canvasRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      setDragOverPosition(null);
    }
  }, []);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentBrainDump) return;
    
    setIsDragOver(false);
    setDragOverPosition(null);
    
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) return;
    
    // Calculate drop position
    let dropPosition = { x: 0, y: 0 };
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      dropPosition = screenToCanvas(
        e.clientX - rect.left,
        e.clientY - rect.top,
        viewport.x,
        viewport.y,
        viewport.zoom
      );
    }
    
    // For now, handle only the first file (show modal)
    const file = files[0];
    if (file) {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        console.error('File validation failed:', validation.error);
        // TODO: Show error toast
        return;
      }
      
      // Show modal for description input
      setPendingFile({ file, position: dropPosition });
    }
  }, [currentBrainDump, viewport]);

  // Handle file drop modal confirmation
  const handleFileModalConfirm = useCallback(async (description: string) => {
    if (!pendingFile) return;
    
    try {
      const addAttachmentIdea = useStore.getState().addAttachmentIdea;
      if (addAttachmentIdea) {
        await addAttachmentIdea(pendingFile.file, pendingFile.position, description);
      }
    } catch (error) {
      console.error('File attachment error:', error);
      // TODO: Show error toast
    } finally {
      setPendingFile(null);
    }
  }, [pendingFile]);

  const handleFileModalCancel = useCallback(() => {
    setPendingFile(null);
  }, []);

  // Handle double-click for quick idea creation
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!currentBrainDump) return;
    
    // Don't trigger on UI elements or when in special modes
    if (isPanning || isSelecting || isCreatingConnection) return;
    
    // Calculate canvas position
    const rect = canvasRef.current!.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // Show quick editor at screen position (we'll convert to canvas coords when creating)
    showQuickEditor(screenX, screenY);
    
    e.preventDefault();
    e.stopPropagation();
  }, [currentBrainDump, isPanning, isSelecting, isCreatingConnection, showQuickEditor]);

  // Handle wheel (zoom) - must use native event listener with passive: false
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!currentBrainDump) return;

    const isZoomGesture = e.metaKey || e.shiftKey;

    if (!isZoomGesture) {
      e.preventDefault();

      const multiplier = e.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? window.innerHeight
        : 1;

      updateViewport({
        x: viewport.x - e.deltaX * multiplier,
        y: viewport.y - e.deltaY * multiplier,
        zoom: viewport.zoom,
      });
      return;
    }

    e.preventDefault();
    
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.max(0.1, Math.min(3, viewport.zoom + delta));
    
    // Zoom towards mouse position
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate the point in canvas coordinates before zoom
      const canvasPointBefore = screenToCanvas(mouseX, mouseY, viewport.x, viewport.y, viewport.zoom);
      
      // Calculate the point in canvas coordinates after zoom
      const canvasPointAfter = screenToCanvas(mouseX, mouseY, viewport.x, viewport.y, newZoom);
      
      // Adjust pan to keep the point under the mouse
      const dx = (canvasPointAfter.x - canvasPointBefore.x) * newZoom;
      const dy = (canvasPointAfter.y - canvasPointBefore.y) * newZoom;
      
      updateViewport({
        x: viewport.x + dx,
        y: viewport.y + dy,
        zoom: newZoom
      });
    }
  }, [viewport, updateViewport, currentBrainDump]);

  // Attach wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Connection handling - add global mouse up
  
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isCreatingConnection) {
        cancelConnection();
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isCreatingConnection, cancelConnection]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs/textareas
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Auto-typing feature: detect alphanumeric characters and numbers
      // Only trigger if we have a current brain dump and input box ref
      if (currentBrainDump && inputBoxRef?.current && 
          !e.metaKey && !e.ctrlKey && !e.altKey && // No modifier keys
          !isCreatingConnection && // Not in connection mode
          e.key.length === 1 && // Single character
          /[a-zA-Z0-9]/.test(e.key)) { // Alphanumeric only
        console.log('🎯 Auto-typing triggered for:', e.key); // Debug log
        e.preventDefault();
        inputBoxRef.current.focusAndSetValue(e.key);
        return;
      }

      // Command+Z (Mac) or Ctrl+Z (Windows/Linux) - Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        // Import dynamically to avoid circular dependency
        import('@/store').then(async ({ undo, canUndo }) => {
          if (canUndo()) {
            await undo();
          }
        });
        return;
      }

      // Command+Shift+Z (Mac) or Ctrl+Shift+Z (Windows/Linux) - Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        // Import dynamically to avoid circular dependency
        import('@/store').then(async ({ redo, canRedo }) => {
          if (canRedo()) {
            await redo();
          }
        });
        return;
      }

      // Escape - clear selection or cancel connection
      if (e.key === 'Escape') {
        if (isCreatingConnection) {
          cancelConnection();
        } else {
          clearSelection();
        }
      }
      
      // Delete/Backspace - delete selected ideas and edges
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedIdeaIdsArray = Array.from(selectedIdeaIds);
        const selectedEdgeIdsArray = Array.from(selectedEdgeIds);
        
        if (selectedIdeaIdsArray.length > 0 || selectedEdgeIdsArray.length > 0) {
          e.preventDefault();
          // Import batch functions dynamically
          import('@/store').then(({ startBatch, endBatch }) => {
            const deleteIdea = useStore.getState().deleteIdea;
            
            // Start batch to group all deletes into one undo
            startBatch();
            
            // Delete all selected ideas
            selectedIdeaIdsArray.forEach(id => deleteIdea(id));
            
            // Delete all selected edges
            selectedEdgeIdsArray.forEach(id => deleteEdge(id));
            
            clearSelection();
            
            // End batch
            endBatch();
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIdeaIds, selectedEdgeIds, clearSelection, deleteEdge, isCreatingConnection, cancelConnection, currentBrainDump, inputBoxRef]);

  const themeBackground = getThemeBackground(theme);
  const hasActiveBrainDump = Boolean(currentBrainDump);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
      style={themeBackground}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleFileDrop}
    >
      {/* Grid Overlay */}
      {isGridVisible && <div className="grid-overlay" style={gridStyle} />}
      
      {/* Transform Container */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Edges (SVG Layer) - MUST render BEFORE ideas so they appear behind */}
        {hasActiveBrainDump && <EdgeRenderer />}
        
        {/* Ideas */}
        {ideas.map(idea => (
          <IdeaNode key={idea.id} idea={idea} />
        ))}
      </div>
      
      {/* Box Selection Overlay */}
      {selectionBox && hasActiveBrainDump && (
        <div
          className="selection-box"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.endX) * viewport.zoom + viewport.x,
            top: Math.min(selectionBox.startY, selectionBox.endY) * viewport.zoom + viewport.y,
            width: Math.abs(selectionBox.endX - selectionBox.startX) * viewport.zoom,
            height: Math.abs(selectionBox.endY - selectionBox.startY) * viewport.zoom,
          }}
        />
      )}
      
      {/* Batch Actions */}
      {hasActiveBrainDump && <BatchActions />}
      
      {/* Connection Line (overlay for edge creation) */}
      {hasActiveBrainDump && <ConnectionLine />}
      
      {/* Drag and Drop Overlay */}
      {isDragOver && dragOverPosition && hasActiveBrainDump && (
        <>
          {/* Drop Zone Indicator */}
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 pointer-events-none z-50" />
          
          {/* Drop Position Indicator */}
          <div
            className="absolute w-48 h-48 border-2 border-dashed border-blue-600 bg-blue-100/20 rounded-lg pointer-events-none z-50 flex items-center justify-center"
            style={{
              left: dragOverPosition.x * viewport.zoom + viewport.x - 96,
              top: dragOverPosition.y * viewport.zoom + viewport.y - 96,
            }}
          >
            <div className="text-blue-600 text-center">
              <div className="text-2xl mb-2">📎</div>
              <div className="text-sm font-medium">Drop file here</div>
            </div>
          </div>
        </>
      )}
      
      {/* Detail Modal */}
      <DetailModal />
      
      {/* File Drop Modal */}
      <FileDropModal
        isOpen={!!pendingFile}
        fileName={pendingFile?.file.name || ''}
        onConfirm={handleFileModalConfirm}
        onCancel={handleFileModalCancel}
      />
      
      {/* Quick Idea Input */}
      <QuickIdeaInput />
      
      {/* Shortcut Assistant */}
      {shortcutAssistant && (
        <ShortcutAssistant
          isVisible={shortcutAssistant.isVisible}
          message={shortcutAssistant.message}
        />
      )}
    </div>
  );
}
