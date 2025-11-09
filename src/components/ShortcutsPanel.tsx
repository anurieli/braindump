'use client'

import { useEffect } from 'react'
import { useStore } from '@/store'

interface ShortcutItem {
  key: string
  description: string
}

interface ShortcutCategory {
  category: string
  items: ShortcutItem[]
}

export default function ShortcutsPanel() {
  const activeModal = useStore(state => state.activeModal)
  const closeModal = useStore(state => state.closeModal)

  const isOpen = activeModal === 'shortcuts'

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closeModal])

  if (!isOpen) return null

  const shortcuts: ShortcutCategory[] = [
    {
      category: 'Canvas Navigation',
      items: [
        { key: 'Ctrl + Drag', description: 'Pan canvas' },
        { key: 'Ctrl + Scroll', description: 'Zoom in/out' },
        { key: 'Ctrl + 0', description: 'Reset view (zoom 100%, center)' },
      ]
    },
    {
      category: 'Brain Dumps',
      items: [
        { key: 'Ctrl + N', description: 'Create new brain dump' },
        { key: 'Ctrl + D', description: 'Duplicate current brain dump' },
        { key: 'Ctrl + /', description: 'Toggle side panel' },
      ]
    },
    {
      category: 'Ideas & Selection',
      items: [
        { key: 'Click', description: 'Create new idea' },
        { key: 'Double-click', description: 'Create idea at cursor' },
        { key: 'Drag', description: 'Select multiple ideas' },
        { key: 'Ctrl + A', description: 'Select all ideas' },
        { key: 'Delete', description: 'Delete selected ideas/edges' },
      ]
    },
    {
      category: 'Editing',
      items: [
        { key: '⌘Z / Ctrl+Z', description: 'Undo last action' },
        { key: '⌘⇧Z / Ctrl+Shift+Z', description: 'Redo last action' },
        { key: 'Enter', description: 'Submit idea (in input box)' },
        { key: 'Shift + Enter', description: 'New line (in input box)' },
      ]
    },
    {
      category: 'Interface',
      items: [
        { key: 'Ctrl + Shift + T', description: 'Toggle theme (light/dark)' },
        { key: 'Ctrl + G', description: 'Toggle grid visibility' },
        { key: 'Escape', description: 'Close modal / Clear input / Deselect' },
      ]
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>⌨️</span>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcuts.map((category) => (
              <div key={category.category} className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 pb-2">
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.items.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 mr-4">
                        {shortcut.description}
                      </span>
                      <kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono whitespace-nowrap border border-gray-300 dark:border-gray-600">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 rounded-b-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💡 Shortcuts work globally except in input fields
            </p>
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}