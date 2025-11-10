'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import { screenToCanvas } from '@/lib/geometry'
import type { ThemeType } from '@/types'
import { themes as themeDefinitions } from '@/lib/themes'

function getThemeTextColor(theme: ThemeType): {
  primary: string
  secondary: string
  tertiary: string
} {
  const themeDef = themeDefinitions[theme]
  const isDark = themeDef?.isDark ?? false
  
  if (isDark) {
    return {
      primary: 'rgba(255, 255, 255, 1)',
      secondary: 'rgba(255, 255, 255, 0.6)',
      tertiary: 'rgba(255, 255, 255, 0.4)',
    }
  } else {
    return {
      primary: 'rgba(31, 41, 55, 1)', // gray-800
      secondary: 'rgba(75, 85, 99, 1)', // gray-600
      tertiary: 'rgba(156, 163, 175, 1)', // gray-400
    }
  }
}

function getThemeGlassStyle(theme: ThemeType, isActive: boolean = false) {
  const themeDef = themeDefinitions[theme]
  const isDark = themeDef?.isDark ?? false
  
  if (isDark) {
    return {
      background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
      border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
      boxShadow: isActive
        ? '0 4px 16px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
        : '0 4px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.15) inset',
    }
  } else {
    return {
      background: isActive ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      border: `1px solid ${isActive ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.08)'}`,
      boxShadow: isActive
        ? '0 4px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
        : '0 4px 16px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.3) inset',
    }
  }
}

export default function QuickIdeaInput() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  
  // Store state
  const quickEditor = useStore(state => state.quickEditor)
  const hideQuickEditor = useStore(state => state.hideQuickEditor)
  const updateQuickEditorText = useStore(state => state.updateQuickEditorText)
  const addIdea = useStore(state => state.addIdea)
  const addEdge = useStore(state => state.addEdge)
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId)
  const theme = useStore(state => state.theme)
  const viewport = useStore(state => state.viewport)
  
  // Focus input when quick editor becomes active
  useEffect(() => {
    if (quickEditor?.isActive && inputRef.current) {
      inputRef.current.focus()
      setIsFocused(true)
    }
  }, [quickEditor?.isActive])

  // Handle clicks outside to cancel
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickEditor?.isActive && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        hideQuickEditor()
      }
    }

    if (quickEditor?.isActive) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [quickEditor?.isActive, hideQuickEditor])

  const handleSubmit = useCallback(async () => {
    if (!quickEditor || !currentBrainDumpId || !quickEditor.text.trim()) {
      hideQuickEditor()
      return
    }

    try {
      // Determine position - use pending connection target position if available
      let targetPos = { x: quickEditor.position.x, y: quickEditor.position.y }
      
      if (quickEditor.pendingConnection) {
        // Use the target position from the pending connection
        targetPos = quickEditor.pendingConnection.targetPosition
      } else {
        // Convert screen coordinates to canvas coordinates for regular quick ideas
        targetPos = screenToCanvas(
          quickEditor.position.x,
          quickEditor.position.y,
          viewport.x,
          viewport.y,
          viewport.zoom
        )
      }

      // Create idea at target position
      const newIdeaId = await addIdea(quickEditor.text.trim(), { 
        x: targetPos.x - 100, // Center the idea (assuming 200px width)
        y: targetPos.y - 50   // Center the idea (assuming 100px height)
      })

      // If there's a pending connection, create the edge
      if (quickEditor.pendingConnection && newIdeaId) {
        await addEdge(quickEditor.pendingConnection.sourceId, newIdeaId, 'related_to')
        console.log('✅ Created edge from', quickEditor.pendingConnection.sourceId, 'to', newIdeaId)
      }

      hideQuickEditor()
    } catch (error) {
      console.error('Failed to create quick idea:', error)
      // Keep editor open on error so user can retry
    }
  }, [quickEditor, currentBrainDumpId, viewport, addIdea, addEdge, hideQuickEditor])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      hideQuickEditor()
    }
    // Shift+Enter allows new line
  }, [handleSubmit, hideQuickEditor])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateQuickEditorText(e.target.value)
  }, [updateQuickEditorText])

  // Don't render if not active
  if (!quickEditor?.isActive) {
    return null
  }

  const textColors = getThemeTextColor(theme)
  const glassStyle = getThemeGlassStyle(theme, isFocused)

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: quickEditor.position.x - 100, // Center around cursor
        top: quickEditor.position.y - 25,   // Position above cursor
        transform: 'translateZ(0)', // Force GPU acceleration
      }}
    >
      <div
        className="relative rounded-lg transition-all duration-200 pointer-events-auto backdrop-blur-xl"
        style={{
          ...glassStyle,
          minWidth: '200px',
          maxWidth: '300px',
        }}
      >
        <textarea
          ref={inputRef}
          value={quickEditor.text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Type your idea..."
          className="w-full bg-transparent outline-none text-sm resize-none p-3"
          style={{ 
            color: textColors.primary,
            minHeight: '50px',
            maxHeight: '120px',
          }}
          rows={2}
        />
        <div className="absolute bottom-1 right-2 text-xs opacity-60" style={{ color: textColors.tertiary }}>
          Enter to save • Esc to cancel
        </div>
      </div>
    </div>
  )
}