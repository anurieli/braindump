'use client'

import { useMemo, useState, useEffect } from 'react';
import { HelpCircle, Edit2, SlidersHorizontal, ZoomIn, ZoomOut, Maximize2, Grid3x3, Moon, Sun, Trash2, Undo2, Redo2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Toolbar from '@/components/Toolbar';
import { useStore, startBatch, endBatch } from '@/store';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { saveUserPreferencesManually } from '@/hooks/useUserPreferences';

function ControlPanelButton() {
  const [isOpen, setIsOpen] = useState(false);

  // Store selectors
  const viewport = useStore(state => state.viewport);
  const updateViewport = useStore(state => state.updateViewport);
  const patternType = useStore(state => state.patternType);
  const toggleGrid = useStore(state => state.toggleGrid);
  const theme = useStore(state => state.theme);
  const toggleTheme = useStore(state => state.toggleTheme);
  const openModal = useStore(state => state.openModal);

  // Get Sets from store
  const selectedIdeaIdsSet = useStore(state => state.selectedIdeaIds);
  const selectedEdgeIdsSet = useStore(state => state.selectedEdgeIds);
  const deleteIdea = useStore(state => state.deleteIdea);
  const deleteEdge = useStore(state => state.deleteEdge);
  const clearSelection = useStore(state => state.clearSelection);

  // Convert Sets to arrays
  const selectedIdeaIds = Array.from(selectedIdeaIdsSet);
  const selectedEdgeIds = Array.from(selectedEdgeIdsSet);
  const hasSelection = selectedIdeaIds.length > 0 || selectedEdgeIds.length > 0;

  const zoomPercent = useMemo(
    () => Math.round(viewport.zoom * 100),
    [viewport.zoom]
  );

  const isDarkTheme = theme === 'dark';

  // Use centralized undo/redo hook
  const { canUndo, canRedo, undo, redo, isPerformingAction } = useUndoRedo();

  const handleZoomIn = () => {
    const newZoom = Math.min(3, viewport.zoom + 0.1);
    updateViewport({ ...viewport, zoom: newZoom });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.1, viewport.zoom - 0.1);
    updateViewport({ ...viewport, zoom: newZoom });
  };

  const handleResetView = () => {
    updateViewport({ x: 0, y: 0, zoom: 1 });
  };

  const handleToggleTheme = async () => {
    toggleTheme();
    setIsOpen(false);
    // Save theme preference to database
    try {
      await saveUserPreferencesManually();
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const handleToggleGrid = async () => {
    toggleGrid();
    setIsOpen(false);
    // Save grid preference to database
    try {
      await saveUserPreferencesManually();
    } catch (error) {
      console.error('Failed to save grid preference:', error);
    }
  };

  const handleUndo = async () => {
    await undo();
  };

  const handleRedo = async () => {
    await redo();
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
    setIsOpen(false);
  };

  const handleOpenShortcuts = () => {
    openModal('shortcuts');
    setIsOpen(false);
  };

  return (
    <>
      {/* Control Panel Button - Only visible on mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="liquid-glass rounded-2xl shadow-2xl p-2 hover:bg-current/10 transition-colors xl:hidden flex-shrink-0"
        title="Control Panel"
      >
        <SlidersHorizontal className="w-5 h-5" />
      </button>

      {/* Control Panel Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Canvas Controls</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Undo/Redo */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleUndo}
                disabled={!canUndo || isPerformingAction}
                className="flex-1"
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Undo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRedo}
                disabled={!canRedo || isPerformingAction}
                className="flex-1"
              >
                <Redo2 className="w-4 h-4 mr-2" />
                Redo
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Zoom</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleZoomOut}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="flex-1 text-center text-sm">{zoomPercent}%</span>
                <Button size="sm" variant="outline" onClick={handleZoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleResetView}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Grid Toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleGrid}
              className="w-full justify-start"
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              {
                patternType === 'none' ? 'Show Grid Dots' :
                patternType === 'dots' ? 'Show Grid Lines' :
                'Hide Grid'
              }
            </Button>

            {/* Theme Toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleTheme}
              className="w-full justify-start"
            >
              {isDarkTheme ? (
                <Sun className="w-4 h-4 mr-2" />
              ) : (
                <Moon className="w-4 h-4 mr-2" />
              )}
              {isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            </Button>

            {/* Keyboard Shortcuts */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenShortcuts}
              className="w-full justify-start"
            >
              <div className="text-purple-500 mr-2">⌨️</div>
              Keyboard Shortcuts
            </Button>

            {/* Delete Selected */}
            {hasSelection && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteSelected}
                className="w-full justify-start text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedIdeaIds.length + selectedEdgeIds.length})
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function CanvasHeader() {
  // Use stable selectors to avoid infinite loops
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId);
  const brainDumps = useStore(state => state.brainDumps);
  const currentBrainDump = useMemo(() => {
    return brainDumps.find(bd => bd.id === currentBrainDumpId) || null;
  }, [brainDumps, currentBrainDumpId]);
  
  const updateBrainDumpName = useStore(state => state.updateBrainDumpName);
  const ideas = useStore(state => state.ideas);
  const edges = useStore(state => state.edges);
  const openModal = useStore(state => state.openModal);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  
  const ideaCount = useMemo(() => {
    if (!currentBrainDumpId) return 0;
    const ideasArray = Array.isArray(ideas) ? ideas : Object.values(ideas || {});
    return ideasArray.filter((idea: any) => idea.brain_dump_id === currentBrainDumpId).length;
  }, [ideas, currentBrainDumpId]);

  const edgeCount = useMemo(() => {
    if (!currentBrainDumpId) return 0;
    const edgesArray = Array.isArray(edges) ? edges : Object.values(edges || {});
    return edgesArray.filter((edge: any) => edge.brain_dump_id === currentBrainDumpId).length;
  }, [edges, currentBrainDumpId]);

  if (!currentBrainDump) return null;
  
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditName(currentBrainDump.name);
  };
  
  const handleSaveEdit = async () => {
    if (editName.trim() && currentBrainDumpId) {
      await updateBrainDumpName(currentBrainDumpId, editName.trim());
    }
    setIsEditing(false);
  };
  
  return (
    <div className="absolute top-6 left-6 right-6 z-50">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="liquid-glass rounded-2xl px-6 py-3 shadow-2xl flex flex-wrap items-center gap-4">
          {/* Brain Dump Name */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                autoFocus
                className="h-8 w-64"
              />
            ) : (
              <>
                <h1 className="text-base font-semibold">
                  {currentBrainDump.name}
                </h1>
                <button
                  onClick={handleStartEdit}
                  className="p-1 hover:bg-current/10 rounded transition-colors"
                  title="Rename"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm opacity-70 border-l border-current/20 pl-4">
            <div>
              <span className="font-medium">{ideaCount}</span> {ideaCount === 1 ? 'idea' : 'ideas'}
            </div>
            <div>
              <span className="font-medium">{edgeCount}</span> {edgeCount === 1 ? 'connection' : 'connections'}
            </div>
          </div>
        </div>

        {/* Right-side Controls */}
        <div className="flex items-center justify-end gap-3 ml-auto flex-nowrap">
          <Toolbar />

          {/* Control Panel Button - Mobile Only */}
          <ControlPanelButton />

          <button
            onClick={() => openModal('help')}
            className="liquid-glass rounded-2xl shadow-2xl p-2 hover:bg-current/10 transition-colors flex-shrink-0"
            title="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
