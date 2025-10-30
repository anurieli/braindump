'use client'

import { useState } from 'react'
import { useStore } from '@/store'

export default function SidePanel() {
  const [hoveredBrainDump, setHoveredBrainDump] = useState<string | null>(null)
  
  // Store selectors
  const isSidebarOpen = useStore(state => state.isSidebarOpen)
  const brainDumps = useStore(state => state.brainDumps)
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId)
  const ideas = useStore(state => state.ideas)
  const createBrainDump = useStore(state => state.createBrainDump)
  const switchBrainDump = useStore(state => state.switchBrainDump)
  const toggleSidebar = useStore(state => state.toggleSidebar)

  // Count ideas for current brain dump
  const getIdeaCount = (brainDumpId: string) => {
    return Object.values(ideas).filter(idea => idea.brain_dump_id === brainDumpId).length
  }

  const handleCreateNew = async () => {
    const name = `Brain Dump ${new Date().toLocaleDateString()}`
    try {
      await createBrainDump(name)
      console.log('🧠 New brain dump created from sidebar')
    } catch (error) {
      console.error('Failed to create brain dump:', error)
    }
  }

  const handleSwitchBrainDump = async (brainDumpId: string) => {
    try {
      await switchBrainDump(brainDumpId)
      console.log(`🔄 Switched to brain dump: ${brainDumpId}`)
    } catch (error) {
      console.error('Failed to switch brain dump:', error)
    }
  }

  const handleDuplicate = async (brainDump: { name: string; id: string }) => {
    const duplicateName = `${brainDump.name} (Copy)`
    try {
      await createBrainDump(duplicateName)
      console.log(`📋 Duplicated brain dump: ${brainDump.name}`)
    } catch (error) {
      console.error('Failed to duplicate brain dump:', error)
    }
  }

  const getBrainDumpInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }

  const handlePanelClick = () => {
    if (!isSidebarOpen) {
      toggleSidebar()
    }
  }

  // Collapsed state (64px wide)
  if (!isSidebarOpen) {
    return (
      <div 
        className="h-full w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg flex flex-col cursor-pointer transition-all duration-300 ease-in-out"
        onClick={handlePanelClick}
      >
        {/* Collapsed Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-center">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>

        {/* New Brain Dump Button - Collapsed */}
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCreateNew()
            }}
            className="w-full aspect-square bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors"
            title="New Brain Dump"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Brain Dumps - Collapsed Icons */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {Object.values(brainDumps).map((brainDump) => {
            const isActive = brainDump.id === currentBrainDumpId
            const ideaCount = getIdeaCount(brainDump.id)
            const initials = getBrainDumpInitials(brainDump.name)

            return (
              <div
                key={brainDump.id}
                className="relative group"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSwitchBrainDump(brainDump.id)
                }}
              >
                <div
                  className={`w-full aspect-square rounded-lg cursor-pointer transition-all flex items-center justify-center text-xs font-bold relative ${
                    isActive 
                      ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 text-blue-900 dark:text-blue-100' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                  title={`${brainDump.name} (${ideaCount} ideas)`}
                >
                  {initials}
                  {/* Idea count badge */}
                  {ideaCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                      {ideaCount > 99 ? '99+' : ideaCount}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Expand indicator */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-center">
          <div className="text-gray-400 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  // Expanded state (256px wide)
  return (
    <div className="h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg flex flex-col transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Brain Dumps
        </h2>
        <button
          onClick={toggleSidebar}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Collapse Side Panel (Ctrl+/)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* New Brain Dump Button */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleCreateNew}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Brain Dump
        </button>
      </div>

      {/* Brain Dumps List */}
      <div className="flex-1 overflow-y-auto">
        {Object.values(brainDumps).length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">🧠</div>
            <p className="text-sm">No brain dumps yet</p>
            <p className="text-xs mt-1">Create your first one above!</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {Object.values(brainDumps).map((brainDump) => {
              const isActive = brainDump.id === currentBrainDumpId
              const ideaCount = getIdeaCount(brainDump.id)
              const isHovered = hoveredBrainDump === brainDump.id

              return (
                <div
                  key={brainDump.id}
                  className={`relative rounded-lg p-3 cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onMouseEnter={() => setHoveredBrainDump(brainDump.id)}
                  onMouseLeave={() => setHoveredBrainDump(null)}
                  onClick={() => handleSwitchBrainDump(brainDump.id)}
                >
                  {/* Brain Dump Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium truncate ${
                        isActive ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {brainDump.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(brainDump.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.477.859h4z" />
                          </svg>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {ideaCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Indicator */}
                    {isActive && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-1 flex-shrink-0"></div>
                    )}
                  </div>

                  {/* Hover Menu */}
                  {isHovered && !isActive && (
                    <div className="absolute right-2 top-2 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSwitchBrainDump(brainDump.id)
                        }}
                        className="bg-white dark:bg-gray-700 rounded p-1 shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        title="Enter"
                      >
                        <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicate(brainDump)
                        }}
                        className="bg-white dark:bg-gray-700 rounded p-1 shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        title="Duplicate"
                      >
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Press <kbd className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-gray-700 dark:text-gray-300">Ctrl+/</kbd> to toggle
        </p>
      </div>
    </div>
  )
}