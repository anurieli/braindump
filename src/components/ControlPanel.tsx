'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/store'

export default function ControlPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Store selectors
  const theme = useStore(state => state.theme)
  const isGridVisible = useStore(state => state.isGridVisible)
  const toggleTheme = useStore(state => state.toggleTheme)
  const toggleGrid = useStore(state => state.toggleGrid)
  const openModal = useStore(state => state.openModal)

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

  const handleShowShortcuts = () => {
    openModal('keyboard-shortcuts')
    setIsOpen(false)
  }

  const handleOpenSettings = () => {
    openModal('settings')
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Control Panel Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Control Panel"
      >
        <svg 
          className="w-5 h-5 text-gray-600 dark:text-gray-300" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-12 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-[220px] py-2 z-30">
          
          {/* Theme Toggle */}
          <div className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={handleToggleTheme}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-yellow-500">
                  {theme === 'light' ? '☀️' : '🌙'}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                </span>
              </div>
              <kbd className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-500 dark:text-gray-400">
                ⌘⇧T
              </kbd>
            </div>
          </div>

          {/* Grid Toggle */}
          <div className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={handleToggleGrid}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-blue-500">
                  📊
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {isGridVisible ? 'Hide Grid' : 'Show Grid'}
                </span>
              </div>
              <kbd className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-500 dark:text-gray-400">
                ⌘G
              </kbd>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>

          {/* Keyboard Shortcuts */}
          <div className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={handleShowShortcuts}>
            <div className="flex items-center gap-3">
              <div className="text-purple-500">
                ⌨️
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Keyboard Shortcuts
              </span>
            </div>
          </div>

          {/* Settings */}
          <div className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={handleOpenSettings}>
            <div className="flex items-center gap-3">
              <div className="text-gray-500">
                ⚙️
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Settings
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}