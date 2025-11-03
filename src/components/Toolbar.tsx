'use client'

import { useStore } from '@/store/canvas-store';
import { themes } from '@/lib/themes';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Grid3x3, 
  Palette,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Toolbar() {
  const zoom = useStore(state => state.zoom);
  const showGrid = useStore(state => state.showGrid);
  const theme = useStore(state => state.theme);
  const selectedIds = useStore(state => state.selectedIds);
  const selectedEdgeIds = useStore(state => state.selectedEdgeIds);
  
  const setZoom = useStore(state => state.setZoom);
  const resetViewport = useStore(state => state.resetViewport);
  const toggleGrid = useStore(state => state.toggleGrid);
  const setTheme = useStore(state => state.setTheme);
  const deleteSelectedIdeas = useStore(state => state.deleteSelectedIdeas);
  const deleteSelectedEdges = useStore(state => state.deleteSelectedEdges);
  
  const handleZoomIn = () => {
    setZoom(Math.min(3, zoom + 0.1));
  };
  
  const handleZoomOut = () => {
    setZoom(Math.max(0.1, zoom - 0.1));
  };
  
  const handleDeleteSelected = () => {
    if (selectedIds.size > 0) {
      deleteSelectedIdeas();
    } else if (selectedEdgeIds.size > 0) {
      deleteSelectedEdges();
    }
  };
  
  const hasSelection = selectedIds.size > 0 || selectedEdgeIds.size > 0;
  
  return (
    <div className="absolute top-6 right-6 z-50">
      <div className="liquid-glass rounded-2xl p-2 shadow-2xl flex items-center gap-2">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1 px-2 border-r border-current/10">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="h-8 w-8"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <span className="text-xs font-medium min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={handleZoomIn}
            title="Zoom In"
            className="h-8 w-8"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={resetViewport}
            title="Reset View"
            className="h-8 w-8"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Grid Toggle */}
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleGrid}
          title={showGrid ? 'Hide Grid' : 'Show Grid'}
          className={`h-8 w-8 ${showGrid ? 'bg-primary/10' : ''}`}
        >
          <Grid3x3 className="w-4 h-4" />
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
              <Palette className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {Object.values(themes).map(themeOption => (
              <DropdownMenuItem
                key={themeOption.name}
                onClick={() => setTheme(themeOption.name)}
                className={theme === themeOption.name ? 'bg-primary/10' : ''}
              >
                <div className="flex items-center gap-2 w-full">
                  <div
                    className="w-4 h-4 rounded-full border border-current/20"
                    style={{
                      background: themeOption.gradient || themeOption.backgroundColor,
                    }}
                  />
                  <span>{themeOption.displayName}</span>
                  {theme === themeOption.name && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
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
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

