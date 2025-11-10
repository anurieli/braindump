'use client'

import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3x3,
  Moon,
  Sun,
  Trash2,
  Undo2,
  Redo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useStore,
  undo,
  redo,
  canUndo,
  canRedo,
  startBatch,
  endBatch,
} from '@/store';
import { saveUserPreferencesManually } from '@/hooks/useUserPreferences';

interface ToolbarProps {
  className?: string;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export default function Toolbar({ className }: ToolbarProps) {
  const viewport = useStore(state => state.viewport);
  const updateViewport = useStore(state => state.updateViewport);
  const isGridVisible = useStore(state => state.isGridVisible);
  const patternType = useStore(state => state.patternType);
  const toggleGrid = useStore(state => state.toggleGrid);
  const theme = useStore(state => state.theme);
  // Get Sets from store - these will trigger re-renders when Set reference changes
  const selectedIdeaIdsSet = useStore(state => state.selectedIdeaIds);
  const selectedEdgeIdsSet = useStore(state => state.selectedEdgeIds);
  
  // Convert Sets to arrays, memoized based on actual contents to prevent infinite loops
  // Use state to store arrays and only update when Set contents actually change
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  
  useEffect(() => {
    const ideaIds = Array.from(selectedIdeaIdsSet).sort();
    const ideaIdsKey = ideaIds.join(',');
    setSelectedIdeaIds(prev => {
      const prevKey = [...prev].sort().join(',');
      return ideaIdsKey !== prevKey ? ideaIds : prev;
    });
  }, [selectedIdeaIdsSet]);
  
  useEffect(() => {
    const edgeIds = Array.from(selectedEdgeIdsSet).sort();
    const edgeIdsKey = edgeIds.join(',');
    setSelectedEdgeIds(prev => {
      const prevKey = [...prev].sort().join(',');
      return edgeIdsKey !== prevKey ? edgeIds : prev;
    });
  }, [selectedEdgeIdsSet]);
  const deleteIdea = useStore(state => state.deleteIdea);
  const deleteEdge = useStore(state => state.deleteEdge);
  const clearSelection = useStore(state => state.clearSelection);
  const ideas = useStore(state => state.ideas);
  const edges = useStore(state => state.edges);

  const [canUndoState, setCanUndoState] = useState<boolean>(canUndo());
  const [canRedoState, setCanRedoState] = useState<boolean>(canRedo());

  useEffect(() => {
    setCanUndoState(canUndo());
    setCanRedoState(canRedo());
  }, [ideas, edges]);

  const hasSelection = selectedIdeaIds.length > 0 || selectedEdgeIds.length > 0;
  const zoomPercent = useMemo(
    () => Math.round(viewport.zoom * 100),
    [viewport.zoom]
  );

  const handleZoomIn = () => {
    const newZoom = Math.min(MAX_ZOOM, viewport.zoom + ZOOM_STEP);
    updateViewport({ ...viewport, zoom: newZoom });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(MIN_ZOOM, viewport.zoom - ZOOM_STEP);
    updateViewport({ ...viewport, zoom: newZoom });
  };

  const handleResetView = () => {
    updateViewport({ x: 0, y: 0, zoom: 1 });
  };

  const handleToggleTheme = async () => {
    const toggleTheme = useStore.getState().toggleTheme;
    toggleTheme();
    // Save theme preference to database
    try {
      await saveUserPreferencesManually();
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const handleUndo = async () => {
    if (!canUndo()) return;
    await undo();
    setCanUndoState(canUndo());
    setCanRedoState(canRedo());
  };

  const handleRedo = async () => {
    if (!canRedo()) return;
    await redo();
    setCanUndoState(canUndo());
    setCanRedoState(canRedo());
  };

  const handleDeleteSelected = async () => {
    if (!hasSelection) return;
    startBatch();
    try {
      await Promise.all([
        ...selectedIdeaIds.map(id => deleteIdea(id)),
        ...selectedEdgeIds.map(id => deleteEdge(id)),
      ]);
      clearSelection();
    } finally {
      endBatch();
    }
  };

  const isDarkTheme = theme === 'dark';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Desktop Controls */}
      <div className="liquid-glass hidden items-center gap-2 rounded-2xl p-2 shadow-2xl md:flex">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1 border-r border-current/10 pr-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleUndo}
            title="Undo (⌘Z)"
            className="h-8 w-8"
            disabled={!canUndoState}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRedo}
            title="Redo (⌘⇧Z)"
            className="h-8 w-8"
            disabled={!canRedoState}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 border-r border-current/10 px-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="h-8 w-8"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs font-medium">
            {zoomPercent}%
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleZoomIn}
            title="Zoom In"
            className="h-8 w-8"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleResetView}
            title="Reset View"
            className="h-8 w-8"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Grid Toggle */}
        <Button
          size="icon"
          variant="ghost"
          onClick={async () => {
            toggleGrid();
            // Save grid preference to database
            try {
              await saveUserPreferencesManually();
            } catch (error) {
              console.error('Failed to save grid preference:', error);
            }
          }}
          title={
            patternType === 'none' ? 'Show Grid Dots' :
            patternType === 'dots' ? 'Show Grid Lines' :
            'Hide Grid'
          }
          className={cn(
            'h-8 w-8',
            patternType !== 'none' && 'bg-primary/10 text-primary-foreground'
          )}
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>

        {/* Dark/Light Theme Toggle */}
        <Button
          size="icon"
          variant="ghost"
          onClick={handleToggleTheme}
          title={isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="h-8 w-8"
        >
          {isDarkTheme ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Keyboard Shortcuts */}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => useStore.getState().openModal('shortcuts')}
          title="Keyboard Shortcuts"
          className="h-8 w-8"
        >
          <div className="text-purple-500 text-lg leading-none">
            ⌨️
          </div>
        </Button>

        {/* Delete Selected */}
        {hasSelection && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDeleteSelected}
            title="Delete Selected"
            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

