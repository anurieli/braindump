'use client'

import { useEffect, useMemo, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3x3,
  Palette,
  Trash2,
  Undo2,
  Redo2,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { themes, type ThemeType } from '@/lib/themes';
import {
  useStore,
  undo,
  redo,
  canUndo,
  canRedo,
  startBatch,
  endBatch,
} from '@/store';

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
  const toggleGrid = useStore(state => state.toggleGrid);
  const theme = useStore(state => state.theme);
  const setTheme = useStore(state => state.setTheme);
  const openModal = useStore(state => state.openModal);
  const selectedIdeaIds = useStore(state => Array.from(state.selectedIdeaIds));
  const selectedEdgeIds = useStore(state => Array.from(state.selectedEdgeIds));
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

  const handleThemeSelect = (themeName: ThemeType) => {
    setTheme(themeName);
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

  const handleOpenSettings = () => {
    openModal('settings');
  };

  const renderThemeMenuItems = (onSelect?: () => void) =>
    Object.values(themes).map(themeOption => (
      <DropdownMenuItem
        key={themeOption.name}
        onSelect={() => {
          handleThemeSelect(themeOption.name);
          onSelect?.();
        }}
        className={cn(
          'flex items-center gap-2',
          theme === themeOption.name && 'bg-primary/10'
        )}
      >
        <span
          className="h-4 w-4 rounded-full border border-current/20"
          style={{
            background: themeOption.gradient || themeOption.backgroundColor,
          }}
        />
        <span className="flex-1 text-sm">{themeOption.displayName}</span>
        {theme === themeOption.name && (
          <span className="text-xs font-medium">✓</span>
        )}
      </DropdownMenuItem>
    ));

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
          onClick={toggleGrid}
          title={isGridVisible ? 'Hide Grid' : 'Show Grid'}
          className={cn(
            'h-8 w-8',
            isGridVisible && 'bg-primary/10 text-primary-foreground'
          )}
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>

        {/* Theme Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              title="Change Theme"
              className="h-8 w-8"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {renderThemeMenuItems()}
          </DropdownMenuContent>
        </DropdownMenu>

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

        {/* Settings */}
        <Button
          size="icon"
          variant="ghost"
          onClick={handleOpenSettings}
          title="Settings"
          className="h-8 w-8"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Controls */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            title="Canvas Controls"
            className="liquid-glass h-10 w-10 rounded-2xl shadow-2xl md:hidden"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Canvas Controls</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={!canUndoState}
              onSelect={event => {
                event.preventDefault();
                handleUndo();
              }}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Undo
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canRedoState}
              onSelect={event => {
                event.preventDefault();
                handleRedo();
              }}
            >
              <Redo2 className="mr-2 h-4 w-4" />
              Redo
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={event => {
                event.preventDefault();
                handleZoomIn();
              }}
            >
              <ZoomIn className="mr-2 h-4 w-4" />
              Zoom In
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={event => {
                event.preventDefault();
                handleZoomOut();
              }}
            >
              <ZoomOut className="mr-2 h-4 w-4" />
              Zoom Out
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={event => {
                event.preventDefault();
                handleResetView();
              }}
            >
              <Maximize2 className="mr-2 h-4 w-4" />
              Reset View
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={event => {
              event.preventDefault();
              toggleGrid();
            }}
          >
            <Grid3x3 className="mr-2 h-4 w-4" />
            {isGridVisible ? 'Hide Grid' : 'Show Grid'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <Palette className="mr-2 h-4 w-4" />
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {renderThemeMenuItems()}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {hasSelection && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  void handleDeleteSelected();
                }}
              >
                <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                Delete Selected
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => {
              handleOpenSettings();
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

