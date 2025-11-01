'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/store'
import ControlPanel from './ControlPanel'

export default function CanvasHeader() {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')

  // Store selectors
  const currentBrainDump = useStore(state => state.getCurrentBrainDump())
  const updateBrainDumpName = useStore(state => state.updateBrainDumpName)
  const ideas = useStore(state => state.ideas)
  const selectedIdeaIds = useStore(state => state.selectedIdeaIds)
  const deleteIdea = useStore(state => state.deleteIdea)
  const clearSelection = useStore(state => state.clearSelection)
  const openModal = useStore(state => state.openModal)

  const ideaCount = Object.keys(ideas).length
  const selectedCount = selectedIdeaIds.size

  const handleEdit = useCallback(() => {
    if (currentBrainDump) {
      setEditName(currentBrainDump.name)
      setIsEditing(true)
    }
  }, [currentBrainDump])

  const handleSave = useCallback(async () => {
    if (currentBrainDump && editName.trim()) {
      try {
        await updateBrainDumpName(currentBrainDump.id, editName.trim())
        setIsEditing(false)
      } catch (error) {
        console.error('Failed to update brain dump name:', error)
      }
    }
  }, [currentBrainDump, editName, updateBrainDumpName])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setEditName('')
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }, [handleSave, handleCancel])

  const handleDelete = useCallback(async () => {
    if (selectedCount === 0) return
    
    // Show confirmation
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedCount} idea${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`
    )
    
    if (confirmed) {
      try {
        // Delete all selected ideas
        const deletePromises = Array.from(selectedIdeaIds).map(id => deleteIdea(id))
        await Promise.all(deletePromises)
        
        // Clear selection after deletion
        clearSelection()
      } catch (error) {
        console.error('Failed to delete ideas:', error)
        alert('Failed to delete some ideas. Please try again.')
      }
    }
  }, [selectedCount, selectedIdeaIds, deleteIdea, clearSelection])

  if (!currentBrainDump) {
    return null
  }

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
      {/* Brain Dump Info Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center gap-3">
          {/* Brain Dump Name */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSave}
                  className="px-2 py-1 text-sm font-medium bg-transparent border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  className="text-green-600 hover:text-green-700 text-xs"
                  title="Save"
                >
                  ✓
                </button>
                <button
                  onClick={handleCancel}
                  className="text-red-600 hover:text-red-700 text-xs"
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onClick={handleEdit}
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                title="Click to edit name"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {currentBrainDump.name}
                </span>
                <svg 
                  className="w-3 h-3 text-gray-400 dark:text-gray-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-gray-300 dark:border-gray-600"></div>

          {/* Idea Count */}
          <div className="flex items-center gap-1.5" title={`${ideaCount} ideas on canvas`}>
            {/* Light bulb icon */}
            <svg 
              className="w-4 h-4 text-yellow-500" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.477.859h4z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {ideaCount}
            </span>
          </div>

          {/* Delete Button (visible when ideas are selected) */}
          {selectedCount > 0 && (
            <>
              {/* Divider */}
              <div className="w-px h-4 bg-gray-300 dark:border-gray-600"></div>
              
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                title={`Delete ${selectedCount} selected idea${selectedCount > 1 ? 's' : ''}`}
              >
                {/* Trash icon */}
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-sm font-medium">
                  {selectedCount}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Control Panel (Settings Dropdown) */}
      <ControlPanel />
    </div>
  )
}