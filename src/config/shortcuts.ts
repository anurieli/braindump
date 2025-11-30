/**
 * Task 14: Centralized Keyboard Shortcuts Configuration
 * 
 * This file defines all keyboard shortcuts in the application and provides
 * a single source of truth for shortcut management.
 */

export type ShortcutCategory = 
  | 'creation' 
  | 'editing' 
  | 'navigation' 
  | 'selection' 
  | 'clipboard' 
  | 'undo' 
  | 'view' 
  | 'help';

export interface ShortcutDefinition {
  id: string;
  keys: string[];
  description: string;
  category: ShortcutCategory;
  displayKeys?: string; // Custom display format (e.g., "Ctrl+Shift+D")
  enabled: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  allowInInput?: boolean; // Allow when focus is in input fields
}

// Platform-aware modifier keys
export const getModifierKey = (): 'cmd' | 'ctrl' => {
  return navigator.platform.includes('Mac') ? 'cmd' : 'ctrl';
};

export const getDisplayModifier = (): string => {
  return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
};

/**
 * All application keyboard shortcuts
 */
export const SHORTCUTS: Record<string, ShortcutDefinition> = {
  // Creation shortcuts
  NEW_IDEA: {
    id: 'NEW_IDEA',
    keys: ['ctrl+n', 'cmd+n'],
    description: 'Create new idea',
    category: 'creation',
    displayKeys: `${getDisplayModifier()}+N`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
  
  QUICK_ADD: {
    id: 'QUICK_ADD',
    keys: ['shift+enter'],
    description: 'Quick add idea at cursor',
    category: 'creation',
    displayKeys: 'Shift+Enter',
    enabled: true,
    preventDefault: true,
    allowInInput: true,
  },
  
  DUPLICATE_IDEA: {
    id: 'DUPLICATE_IDEA',
    keys: ['ctrl+d', 'cmd+d'],
    description: 'Duplicate selected idea(s)',
    category: 'creation',
    displayKeys: `${getDisplayModifier()}+D`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },

  // Editing shortcuts
  START_EDITING: {
    id: 'START_EDITING',
    keys: ['enter', 'f2'],
    description: 'Start editing selected idea',
    category: 'editing',
    displayKeys: 'Enter / F2',
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
  
  SAVE_EDIT: {
    id: 'SAVE_EDIT',
    keys: ['enter'],
    description: 'Save current edit',
    category: 'editing',
    displayKeys: 'Enter',
    enabled: true,
    preventDefault: true,
    allowInInput: true,
  },
  
  CANCEL_EDIT: {
    id: 'CANCEL_EDIT',
    keys: ['escape'],
    description: 'Cancel current edit',
    category: 'editing',
    displayKeys: 'Esc',
    enabled: true,
    preventDefault: true,
    allowInInput: true,
  },

  DELETE_SELECTED: {
    id: 'DELETE_SELECTED',
    keys: ['delete', 'backspace'],
    description: 'Delete selected idea(s)/edge(s)',
    category: 'editing',
    displayKeys: 'Delete',
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },

  // Selection shortcuts
  SELECT_ALL: {
    id: 'SELECT_ALL',
    keys: ['ctrl+a', 'cmd+a'],
    description: 'Select all ideas',
    category: 'selection',
    displayKeys: `${getDisplayModifier()}+A`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
  
  CLEAR_SELECTION: {
    id: 'CLEAR_SELECTION',
    keys: ['escape'],
    description: 'Clear selection',
    category: 'selection',
    displayKeys: 'Esc',
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
  
  MULTI_SELECT_TOGGLE: {
    id: 'MULTI_SELECT_TOGGLE',
    keys: ['ctrl+click', 'cmd+click'],
    description: 'Add/remove from selection',
    category: 'selection',
    displayKeys: `${getDisplayModifier()}+Click`,
    enabled: true,
    preventDefault: false,
    allowInInput: false,
  },

  // Clipboard shortcuts
  COPY: {
    id: 'COPY',
    keys: ['ctrl+c', 'cmd+c'],
    description: 'Copy selected idea(s)',
    category: 'clipboard',
    displayKeys: `${getDisplayModifier()}+C`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
  
  CUT: {
    id: 'CUT',
    keys: ['ctrl+x', 'cmd+x'],
    description: 'Cut selected idea(s)',
    category: 'clipboard',
    displayKeys: `${getDisplayModifier()}+X`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
  
  PASTE: {
    id: 'PASTE',
    keys: ['ctrl+v', 'cmd+v'],
    description: 'Paste idea(s) from clipboard',
    category: 'clipboard',
    displayKeys: `${getDisplayModifier()}+V`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },

  // Undo/Redo shortcuts
  UNDO: {
    id: 'UNDO',
    keys: ['ctrl+z', 'cmd+z'],
    description: 'Undo last action',
    category: 'undo',
    displayKeys: `${getDisplayModifier()}+Z`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
  
  REDO: {
    id: 'REDO',
    keys: ['ctrl+shift+z', 'cmd+shift+z', 'ctrl+y'],
    description: 'Redo last undone action',
    category: 'undo',
    displayKeys: `${getDisplayModifier()}+Shift+Z`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },

  // Navigation shortcuts  
  ZOOM_IN: {
    id: 'ZOOM_IN',
    keys: ['ctrl+=', 'cmd+=', 'ctrl++', 'cmd++'],
    description: 'Zoom in',
    category: 'navigation',
    displayKeys: `${getDisplayModifier()}++`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
  
  ZOOM_OUT: {
    id: 'ZOOM_OUT',
    keys: ['ctrl+-', 'cmd+-'],
    description: 'Zoom out',
    category: 'navigation',
    displayKeys: `${getDisplayModifier()}+-`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
  
  ZOOM_RESET: {
    id: 'ZOOM_RESET',
    keys: ['ctrl+0', 'cmd+0'],
    description: 'Reset zoom to 100%',
    category: 'navigation',
    displayKeys: `${getDisplayModifier()}+0`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
  
  FIT_TO_VIEW: {
    id: 'FIT_TO_VIEW',
    keys: ['ctrl+shift+f', 'cmd+shift+f'],
    description: 'Fit all ideas to view',
    category: 'navigation',
    displayKeys: `${getDisplayModifier()}+Shift+F`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },

  // View shortcuts
  TOGGLE_GRID: {
    id: 'TOGGLE_GRID',
    keys: ['ctrl+shift+g', 'cmd+shift+g'],
    description: 'Toggle grid visibility',
    category: 'view',
    displayKeys: `${getDisplayModifier()}+Shift+G`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
  
  TOGGLE_SIDEBAR: {
    id: 'TOGGLE_SIDEBAR',
    keys: ['ctrl+shift+s', 'cmd+shift+s'],
    description: 'Toggle sidebar',
    category: 'view',
    displayKeys: `${getDisplayModifier()}+Shift+S`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
  
  TOGGLE_FULLSCREEN: {
    id: 'TOGGLE_FULLSCREEN',
    keys: ['f11'],
    description: 'Toggle fullscreen mode',
    category: 'view',
    displayKeys: 'F11',
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },

  TOGGLE_THEME: {
    id: 'TOGGLE_THEME',
    keys: ['ctrl+shift+t', 'cmd+shift+t'],
    description: 'Toggle dark/light theme',
    category: 'view',
    displayKeys: `${getDisplayModifier()}+Shift+T`,
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },

  // Help shortcuts
  SHOW_HELP: {
    id: 'SHOW_HELP',
    keys: ['f1', 'shift+/'],
    description: 'Show keyboard shortcuts help',
    category: 'help',
    displayKeys: 'F1 / Shift+?',
    enabled: true,
    preventDefault: true,
    allowInInput: false,
  },
};

/**
 * Get shortcuts grouped by category
 */
export const getShortcutsByCategory = (): Record<ShortcutCategory, ShortcutDefinition[]> => {
  const categories: Record<ShortcutCategory, ShortcutDefinition[]> = {
    creation: [],
    editing: [],
    navigation: [],
    selection: [],
    clipboard: [],
    undo: [],
    view: [],
    help: [],
  };

  Object.values(SHORTCUTS).forEach(shortcut => {
    if (shortcut.enabled) {
      categories[shortcut.category].push(shortcut);
    }
  });

  return categories;
};

/**
 * Category display names for UI
 */
export const CATEGORY_NAMES: Record<ShortcutCategory, string> = {
  creation: 'Creating Ideas',
  editing: 'Editing',
  navigation: 'Navigation',
  selection: 'Selection',
  clipboard: 'Copy & Paste',
  undo: 'Undo & Redo',
  view: 'View Options',
  help: 'Help',
};

/**
 * Get enabled shortcut keys for a specific shortcut ID
 */
export const getShortcutKeys = (shortcutId: string): string[] => {
  const shortcut = SHORTCUTS[shortcutId];
  return shortcut?.enabled ? shortcut.keys : [];
};

/**
 * Check if a shortcut should be allowed in the current context
 */
export const shouldAllowShortcut = (
  shortcutId: string, 
  isInputFocused: boolean,
  activeModal: string | null
): boolean => {
  const shortcut = SHORTCUTS[shortcutId];
  if (!shortcut?.enabled) return false;
  
  // Block shortcuts when modal is open (except help shortcuts)
  if (activeModal && shortcut.category !== 'help') return false;
  
  // Check if shortcut is allowed in input fields
  if (isInputFocused && !shortcut.allowInInput) return false;
  
  return true;
};