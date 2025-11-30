/**
 * Task 14: Centralized Application Hotkeys Hook
 * 
 * This hook manages all keyboard shortcuts in the application using react-hotkeys-hook.
 * It provides a single place for hotkey registration and handling.
 */

import { useHotkeys } from 'react-hotkeys-hook';
import { useStore, undo, redo, canUndo, canRedo } from '@/store';
import { SHORTCUTS, shouldAllowShortcut, type ShortcutDefinition } from '@/config/shortcuts';
import { useCallback, useEffect } from 'react';

// Types for hotkey handlers
export type HotkeyHandler = () => void | Promise<void>;
export type HotkeyHandlers = Partial<Record<keyof typeof SHORTCUTS, HotkeyHandler>>;

interface UseAppHotkeysOptions {
  /**
   * Custom handlers for specific shortcuts.
   * If not provided, default handlers will be used.
   */
  customHandlers?: HotkeyHandlers;
  
  /**
   * Whether to enable all shortcuts (default: true)
   */
  enabled?: boolean;
  
  /**
   * Whether to log shortcut activations (default: false)
   */
  debug?: boolean;
}

/**
 * Central hotkey management hook
 */
export function useAppHotkeys(options: UseAppHotkeysOptions = {}) {
  const {
    customHandlers = {},
    enabled = true,
    debug = false
  } = options;

  // Store selectors
  const activeModal = useStore(state => state.activeModal);
  const selectedIdeaIds = useStore(state => state.selectedIdeaIds);
  const selectedEdgeIds = useStore(state => state.selectedEdgeIds);
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId);
  const viewport = useStore(state => state.viewport);
  const isGridVisible = useStore(state => state.isGridVisible);
  const isSidebarOpen = useStore(state => state.isSidebarOpen);
  const theme = useStore(state => state.theme);
  const ideas = useStore(state => state.ideas);
  const clipboardState = useStore(state => state.clipboardState);

  // Store actions
  const addIdea = useStore(state => state.addIdea);
  const deleteIdea = useStore(state => state.deleteIdea);
  const deleteEdge = useStore(state => state.deleteEdge);
  const setSelection = useStore(state => state.setSelection);
  const clearSelection = useStore(state => state.clearSelection);
  const copyToClipboard = useStore(state => state.copyToClipboard);
  const cutToClipboard = useStore(state => state.cutToClipboard);
  const pasteFromClipboard = useStore(state => state.pasteFromClipboard);
  const updateViewport = useStore(state => state.updateViewport);
  const toggleGrid = useStore(state => state.toggleGrid);
  const toggleSidebar = useStore(state => state.toggleSidebar);
  const toggleTheme = useStore(state => state.toggleTheme);
  const openModal = useStore(state => state.openModal);

  // Track if input is focused
  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';
    
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      isContentEditable ||
      activeElement.hasAttribute('data-editing')
    );
  }, []);

  // Default shortcut handlers
  const defaultHandlers: HotkeyHandlers = {
    // Creation shortcuts
    NEW_IDEA: useCallback(async () => {
      if (!currentBrainDumpId) return;
      
      const centerX = -viewport.x + window.innerWidth / 2;
      const centerY = -viewport.y + window.innerHeight / 2;
      const canvasX = centerX / viewport.zoom;
      const canvasY = centerY / viewport.zoom;
      
      await addIdea('', { x: canvasX, y: canvasY });
      if (debug) console.log('🆕 Created new idea via shortcut');
    }, [addIdea, currentBrainDumpId, viewport, debug]),

    DUPLICATE_IDEA: useCallback(async () => {
      if (selectedIdeaIds.size === 0) return;
      
      // Duplicate all selected ideas
      for (const ideaId of selectedIdeaIds) {
        const idea = ideas[ideaId];
        if (idea) {
          const newPosition = {
            x: idea.position_x + 50,
            y: idea.position_y + 50
          };
          await addIdea(idea.text || '', newPosition);
        }
      }
      
      if (debug) console.log('📋 Duplicated selected ideas via shortcut');
    }, [selectedIdeaIds, ideas, addIdea, debug]),

    // Editing shortcuts
    DELETE_SELECTED: useCallback(async () => {
      // Delete selected ideas
      if (selectedIdeaIds.size > 0) {
        for (const ideaId of selectedIdeaIds) {
          await deleteIdea(ideaId);
        }
        clearSelection();
        if (debug) console.log('🗑️ Deleted selected ideas via shortcut');
      }
      
      // Delete selected edges
      if (selectedEdgeIds.size > 0) {
        for (const edgeId of selectedEdgeIds) {
          await deleteEdge(edgeId);
        }
        if (debug) console.log('🗑️ Deleted selected edges via shortcut');
      }
    }, [selectedIdeaIds, selectedEdgeIds, deleteIdea, deleteEdge, clearSelection, debug]),

    // Selection shortcuts
    SELECT_ALL: useCallback(() => {
      if (!currentBrainDumpId) return;
      
      const brainDumpIdeas = Object.values(ideas).filter(
        idea => idea.brain_dump_id === currentBrainDumpId
      );
      const allIdeaIds = brainDumpIdeas.map(idea => idea.id);
      setSelection(allIdeaIds);
      
      if (debug) console.log('✅ Selected all ideas via shortcut');
    }, [ideas, currentBrainDumpId, setSelection, debug]),

    CLEAR_SELECTION: useCallback(() => {
      clearSelection();
      if (debug) console.log('❌ Cleared selection via shortcut');
    }, [clearSelection, debug]),

    // Clipboard shortcuts
    COPY: useCallback(() => {
      if (selectedIdeaIds.size === 0) return;
      
      copyToClipboard(Array.from(selectedIdeaIds));
      if (debug) console.log('📋 Copied to clipboard via shortcut');
    }, [selectedIdeaIds, copyToClipboard, debug]),

    CUT: useCallback(() => {
      if (selectedIdeaIds.size === 0) return;
      
      cutToClipboard(Array.from(selectedIdeaIds));
      if (debug) console.log('✂️ Cut to clipboard via shortcut');
    }, [selectedIdeaIds, cutToClipboard, debug]),

    PASTE: useCallback(async () => {
      if (!clipboardState.items.length) return;
      
      const centerX = -viewport.x + window.innerWidth / 2;
      const centerY = -viewport.y + window.innerHeight / 2;
      const canvasX = centerX / viewport.zoom;
      const canvasY = centerY / viewport.zoom;
      
      await pasteFromClipboard({ x: canvasX, y: canvasY });
      if (debug) console.log('📌 Pasted from clipboard via shortcut');
    }, [clipboardState, viewport, pasteFromClipboard, debug]),

    // Undo/Redo shortcuts
    UNDO: useCallback(async () => {
      if (canUndo()) {
        await undo();
        if (debug) console.log('↶ Undo via shortcut');
      }
    }, [debug]),

    REDO: useCallback(async () => {
      if (canRedo()) {
        await redo();
        if (debug) console.log('↷ Redo via shortcut');
      }
    }, [debug]),

    // Navigation shortcuts
    ZOOM_IN: useCallback(() => {
      const newZoom = Math.min(viewport.zoom * 1.2, 3);
      updateViewport({ zoom: newZoom });
      if (debug) console.log('🔍 Zoom in via shortcut');
    }, [viewport, updateViewport, debug]),

    ZOOM_OUT: useCallback(() => {
      const newZoom = Math.max(viewport.zoom / 1.2, 0.2);
      updateViewport({ zoom: newZoom });
      if (debug) console.log('🔍 Zoom out via shortcut');
    }, [viewport, updateViewport, debug]),

    ZOOM_RESET: useCallback(() => {
      updateViewport({ zoom: 1 });
      if (debug) console.log('🎯 Reset zoom via shortcut');
    }, [updateViewport, debug]),

    FIT_TO_VIEW: useCallback(() => {
      if (!currentBrainDumpId) return;
      
      const brainDumpIdeas = Object.values(ideas).filter(
        idea => idea.brain_dump_id === currentBrainDumpId
      );
      
      if (brainDumpIdeas.length === 0) return;
      
      // Calculate bounding box of all ideas
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      brainDumpIdeas.forEach(idea => {
        const width = idea.width || 200;
        const height = idea.height || 100;
        minX = Math.min(minX, idea.position_x);
        maxX = Math.max(maxX, idea.position_x + width);
        minY = Math.min(minY, idea.position_y);
        maxY = Math.max(maxY, idea.position_y + height);
      });
      
      const padding = 100;
      const contentWidth = maxX - minX + padding * 2;
      const contentHeight = maxY - minY + padding * 2;
      
      const scaleX = window.innerWidth / contentWidth;
      const scaleY = window.innerHeight / contentHeight;
      const newZoom = Math.min(scaleX, scaleY, 1);
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      updateViewport({
        x: -centerX * newZoom + window.innerWidth / 2,
        y: -centerY * newZoom + window.innerHeight / 2,
        zoom: newZoom
      });
      
      if (debug) console.log('🎯 Fit to view via shortcut');
    }, [ideas, currentBrainDumpId, updateViewport, debug]),

    // View shortcuts
    TOGGLE_GRID: useCallback(() => {
      toggleGrid();
      if (debug) console.log('🗂️ Toggle grid via shortcut');
    }, [toggleGrid, debug]),

    TOGGLE_SIDEBAR: useCallback(() => {
      toggleSidebar();
      if (debug) console.log('📁 Toggle sidebar via shortcut');
    }, [toggleSidebar, debug]),

    TOGGLE_THEME: useCallback(() => {
      toggleTheme();
      if (debug) console.log('🌓 Toggle theme via shortcut');
    }, [toggleTheme, debug]),

    TOGGLE_FULLSCREEN: useCallback(() => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      if (debug) console.log('🖼️ Toggle fullscreen via shortcut');
    }, [debug]),

    // Help shortcuts
    SHOW_HELP: useCallback(() => {
      openModal('shortcuts-help');
      if (debug) console.log('❓ Show help via shortcut');
    }, [openModal, debug]),
  };

  // Register all enabled shortcuts
  Object.entries(SHORTCUTS).forEach(([shortcutId, shortcut]) => {
    const handler = customHandlers[shortcutId as keyof typeof SHORTCUTS] || 
                   defaultHandlers[shortcutId as keyof typeof SHORTCUTS];
    
    if (handler && shortcut.enabled) {
      useHotkeys(
        shortcut.keys,
        (event) => {
          const inputFocused = isInputFocused();
          
          if (!shouldAllowShortcut(shortcutId, inputFocused, activeModal)) {
            return;
          }
          
          if (shortcut.preventDefault) {
            event.preventDefault();
          }
          
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }
          
          if (debug) {
            console.log(`🔥 Triggered shortcut: ${shortcutId} (${shortcut.keys.join(', ')})`);
          }
          
          handler();
        },
        {
          enabled: enabled && shortcut.enabled,
          enableOnFormTags: shortcut.allowInInput ? ['INPUT', 'TEXTAREA'] : false,
          enableOnContentEditable: shortcut.allowInInput,
        },
        [
          handler, 
          enabled, 
          shortcut.enabled, 
          shortcut.preventDefault, 
          shortcut.stopPropagation,
          activeModal,
          debug
        ]
      );
    }
  });

  // Return utility functions and state
  return {
    isInputFocused,
    shortcuts: SHORTCUTS,
    canUndo: canUndo(),
    canRedo: canRedo(),
    clipboardHasItems: clipboardState.items.length > 0,
    selectedCount: selectedIdeaIds.size,
  };
}

/**
 * Simplified hook for components that only need specific shortcuts
 */
export function useSpecificHotkeys(
  shortcuts: Array<keyof typeof SHORTCUTS>,
  customHandlers: HotkeyHandlers,
  options?: Pick<UseAppHotkeysOptions, 'enabled' | 'debug'>
) {
  const filteredHandlers = Object.fromEntries(
    shortcuts.map(shortcut => [shortcut, customHandlers[shortcut]]).filter(([, handler]) => handler)
  ) as HotkeyHandlers;
  
  return useAppHotkeys({
    ...options,
    customHandlers: filteredHandlers,
  });
}