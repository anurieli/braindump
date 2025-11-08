'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ShortcutItem {
  key: string
  description: string
}

interface ShortcutCategory {
  category: string
  items: ShortcutItem[]
}

export default function ShortcutsPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('Ideas & Selection')

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

  const selectedCategoryData = shortcuts.find(cat => cat.category === selectedCategory)
  const visibleShortcuts = isExpanded 
    ? selectedCategoryData?.items || [] 
    : (selectedCategoryData?.items.slice(0, 3) || [])

  return (
    <div className="fixed top-4 right-4 z-40 max-w-sm">
      <div className="liquid-glass rounded-2xl shadow-2xl border border-current/10 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-current/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⌨️</span>
              <h3 className="text-sm font-semibold">Shortcuts</h3>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-current/10 rounded transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Category Selector */}
        <div className="px-4 py-2 border-b border-current/10">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-transparent text-xs border border-current/20 rounded px-2 py-1 focus:outline-none focus:border-current/40"
          >
            {shortcuts.map((category) => (
              <option key={category.category} value={category.category}>
                {category.category}
              </option>
            ))}
          </select>
        </div>

        {/* Shortcuts List */}
        <div className="px-4 py-2 space-y-1.5">
          {visibleShortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <span className="text-current/80 flex-1 mr-2 truncate">
                {shortcut.description}
              </span>
              <kbd className="bg-current/10 px-1.5 py-0.5 rounded text-xs font-mono whitespace-nowrap">
                {shortcut.key}
              </kbd>
            </div>
          ))}
          
          {!isExpanded && selectedCategoryData && selectedCategoryData.items.length > 3 && (
            <div className="text-xs text-current/60 pt-1 border-t border-current/10">
              +{selectedCategoryData.items.length - 3} more shortcuts
            </div>
          )}
        </div>

        {/* Footer tip when expanded */}
        {isExpanded && (
          <div className="px-4 py-2 border-t border-current/10 bg-current/5">
            <p className="text-xs text-current/60">
              💡 Shortcuts work globally except in input fields
            </p>
          </div>
        )}
      </div>
    </div>
  )
}