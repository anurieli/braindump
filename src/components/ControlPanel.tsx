'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/store'
import { useUndoRedo } from '@/hooks/useUndoRedo'
import { Undo2, Redo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function KeyboardShortcutsButton() {
  const openModal = useStore(state => state.openModal)

  const handleOpenShortcuts = () => {
    openModal('shortcuts-help')
  }

  return (
    <button
      onClick={handleOpenShortcuts}
      className="liquid-glass rounded-2xl shadow-2xl p-2 hover:bg-current/10 transition-colors"
      title="Keyboard Shortcuts"
    >
      <div className="text-purple-500 text-lg">
        ⌨️
      </div>
    </button>
  )
}

export default function ControlPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Store selectors
  const theme = useStore(state => state.theme)
  const isGridVisible = useStore(state => state.isGridVisible)
  const toggleTheme = useStore(state => state.toggleTheme)
  const toggleGrid = useStore(state => state.toggleGrid)
  const openModal = useStore(state => state.openModal)
  
  // Use centralized undo/redo hook
  const { canUndo, canRedo, undo, redo, isPerformingAction } = useUndoRedo()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleTheme = () => {
    toggleTheme()
    console.log('🎨 Theme toggled from control panel')
  }

  const handleToggleGrid = () => {
    toggleGrid()
    console.log('📊 Grid toggled from control panel')
  }


  const handleOpenSettings = () => {
    openModal('settings')
    setIsOpen(false)
  }

  const handleUndo = async () => {
    await undo()
  }

  const handleRedo = async () => {
    await redo()
  }

  return (
    <div className="flex items-center gap-2">
      {/* Undo/Redo Buttons */}
      <div className="liquid-glass rounded-2xl p-2 shadow-2xl flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleUndo}
          disabled={!canUndo || isPerformingAction}
          title="Undo (⌘Z)"
          className="h-8 w-8"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleRedo}
          disabled={!canRedo || isPerformingAction}
          title="Redo (⌘⇧Z)"
          className="h-8 w-8"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Control Panel */}
      <div className="relative" ref={dropdownRef}>
        {/* Control Panel Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="liquid-glass rounded-2xl shadow-2xl p-2 hover:bg-current/10 transition-colors"
          title="Control Panel"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-12 right-0 liquid-glass rounded-2xl shadow-2xl min-w-[220px] py-2 z-30 border border-current/10">
            
            {/* Theme Toggle */}
            <div className="px-4 py-2 hover:bg-current/10 cursor-pointer" onClick={handleToggleTheme}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-yellow-500">
                    {theme === 'light' ? '☀️' : '🌙'}
                  </div>
                  <span className="text-sm font-medium">
                    {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </div>
                <kbd className="text-xs bg-current/10 px-2 py-1 rounded">
                  ⌘⇧T
                </kbd>
              </div>
            </div>

            {/* Grid Toggle */}
            <div className="px-4 py-2 hover:bg-current/10 cursor-pointer" onClick={handleToggleGrid}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-blue-500">
                    📊
                  </div>
                  <span className="text-sm font-medium">
                    {isGridVisible ? 'Hide Grid' : 'Show Grid'}
                  </span>
                </div>
                <kbd className="text-xs bg-current/10 px-2 py-1 rounded">
                  ⌘G
                </kbd>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-current/10 my-2"></div>

            {/* Settings */}
            <div className="px-4 py-2 hover:bg-current/10 cursor-pointer" onClick={handleOpenSettings}>
              <div className="flex items-center gap-3">
                <div className="text-gray-500">
                  ⚙️
                </div>
                <span className="text-sm font-medium">
                  Settings
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}