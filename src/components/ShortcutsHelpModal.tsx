/**
 * Task 14: Shortcuts Help Modal Component
 * 
 * This component displays all available keyboard shortcuts organized by category.
 * It's triggered by the F1 or Shift+? shortcut.
 */

'use client';

import { useStore } from '@/store';
import { getShortcutsByCategory, CATEGORY_NAMES, type ShortcutCategory } from '@/config/shortcuts';
import { X, Keyboard } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ShortcutsHelpModal() {
  const activeModal = useStore(state => state.activeModal);
  const closeModal = useStore(state => state.closeModal);
  const theme = useStore(state => state.theme);
  
  const [shortcutsByCategory, setShortcutsByCategory] = useState(getShortcutsByCategory());
  
  const isOpen = activeModal === 'shortcuts-help';
  const isDarkMode = theme === 'dark';

  // Update shortcuts when modal opens (in case they changed)
  useEffect(() => {
    if (isOpen) {
      setShortcutsByCategory(getShortcutsByCategory());
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const categoryOrder: ShortcutCategory[] = [
    'creation',
    'editing', 
    'selection',
    'clipboard',
    'undo',
    'navigation',
    'view',
    'help'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
      />
      
      {/* Modal */}
      <div 
        className={`
          relative max-w-4xl max-h-[90vh] w-full mx-4 
          rounded-xl shadow-2xl overflow-hidden
          ${isDarkMode 
            ? 'bg-gray-800 text-white border border-gray-700' 
            : 'bg-white text-gray-900 border border-gray-200'
          }
        `}
      >
        {/* Header */}
        <div className={`
          px-6 py-4 border-b flex items-center justify-between
          ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          </div>
          
          <button
            onClick={closeModal}
            className={`
              p-2 rounded-lg transition-colors
              ${isDarkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }
            `}
            aria-label="Close shortcuts help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {categoryOrder.map(category => {
                const shortcuts = shortcutsByCategory[category];
                if (!shortcuts.length) return null;

                return (
                  <div key={category} className="space-y-3">
                    {/* Category Header */}
                    <h3 className={`
                      text-lg font-medium border-b pb-2
                      ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}
                    `}>
                      {CATEGORY_NAMES[category]}
                    </h3>
                    
                    {/* Shortcuts List */}
                    <div className="space-y-2">
                      {shortcuts.map(shortcut => (
                        <div 
                          key={shortcut.id}
                          className="flex items-center justify-between gap-4 py-1"
                        >
                          {/* Description */}
                          <span className={`
                            text-sm flex-1
                            ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}
                          `}>
                            {shortcut.description}
                          </span>
                          
                          {/* Shortcut Keys */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {shortcut.displayKeys ? (
                              <ShortcutBadge 
                                keys={shortcut.displayKeys} 
                                isDarkMode={isDarkMode}
                              />
                            ) : (
                              shortcut.keys.slice(0, 2).map((key, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  {index > 0 && (
                                    <span className={`
                                      text-xs px-1
                                      ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}
                                    `}>
                                      or
                                    </span>
                                  )}
                                  <ShortcutBadge keys={key} isDarkMode={isDarkMode} />
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer tip */}
            <div className={`
              mt-8 p-4 rounded-lg border-l-4 border-blue-500
              ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}
            `}>
              <p className={`
                text-sm
                ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}
              `}>
                <strong>Tip:</strong> Most shortcuts work globally, but some are disabled when editing text. 
                Press <ShortcutBadge keys="Esc" isDarkMode={isDarkMode} /> to exit edit mode and enable all shortcuts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Component to display individual shortcut key combinations
 */
function ShortcutBadge({ keys, isDarkMode }: { keys: string; isDarkMode: boolean }) {
  const keyParts = keys.split('+').map(key => key.trim());
  
  return (
    <div className="flex items-center gap-1">
      {keyParts.map((key, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && (
            <span className={`
              text-xs
              ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}
            `}>
              +
            </span>
          )}
          <kbd className={`
            px-2 py-1 text-xs font-mono rounded
            border min-w-[24px] text-center
            ${isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-gray-200' 
              : 'bg-gray-100 border-gray-300 text-gray-700'
            }
          `}>
            {key}
          </kbd>
        </div>
      ))}
    </div>
  );
}