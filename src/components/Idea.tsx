'use client'

import { useState, useCallback, useRef } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { Idea as IdeaType } from '@/types'
import { useStore, useIsIdeaSelected } from '@/store'

interface IdeaProps {
  idea: IdeaType
}

interface ViewState {
  isHovered: boolean
  isSelected: boolean
}

export default function Idea({ 
  idea
}: IdeaProps) {
  const [viewState, setViewState] = useState<ViewState>({
    isHovered: false,
    isSelected: false
  })
  const groupRef = useRef<any>(null)
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map())

  // Store selectors
  const selectedIdeaId = useStore(state => state.selectedIdeaId)
  const selectIdea = useStore(state => state.selectIdea)
  const updateIdeaPosition = useStore(state => state.updateIdeaPosition)
  const ideas = useStore(state => state.ideas)
  const selectedIdeaIds = useStore(state => state.selectedIdeaIds)
  const setSelection = useStore(state => state.setSelection)
  const activeModal = useStore(state => state.activeModal)

  // Check if this idea is selected (using new multi-selection system)
  const isMultiSelected = useIsIdeaSelected(idea.id)
  const isSelected = selectedIdeaId === idea.id || isMultiSelected

  // Determine which text to display based on view state
  const getDisplayText = useCallback(() => {
    const text = idea.content || 'Loading...'
    const summary = idea.summary || ''
    
    if (viewState.isHovered && text.length > 0) {
      // Peak view: show full text
      return text
    } else {
      // Compact view: show summary if available, otherwise truncated text
      if (summary && summary.length > 0) {
        return summary
      }
      
      // Truncate text for compact view (roughly 3 lines at 40 chars each)
      const maxLength = 120
      if (text.length > maxLength) {
        return text.substring(0, maxLength) + '...'
      }
      return text
    }
  }, [viewState.isHovered, idea.content, idea.summary])

  // Calculate dynamic dimensions based on text and view state
  const getDimensions = useCallback(() => {
    const baseWidth = idea.width || 200
    const baseHeight = idea.height || 100
    const text = idea.content || ''
    const summary = idea.summary || ''
    
    if (viewState.isHovered && text.length > summary.length) {
      // Peak view: expand to show more text
      const textLength = text.length
      const estimatedLines = Math.ceil(textLength / 40) // ~40 chars per line
      const expandedHeight = Math.max(baseHeight, Math.min(300, estimatedLines * 20 + 40)) // Max 300px height
      const expandedWidth = Math.max(baseWidth, Math.min(400, baseWidth * 1.2)) // Max 400px width
      
      return { width: expandedWidth, height: expandedHeight }
    }
    
    return { width: baseWidth, height: baseHeight }
  }, [viewState.isHovered, idea.width, idea.height, idea.content, idea.summary])

  // Get colors based on idea state and selection
  const getColors = useCallback(() => {
    let fillColor = '#ffffff'
    let strokeColor = '#e5e7eb'
    const textColor = '#1f2937'

    // State-based colors
    switch (idea.state) {
      case 'generating':
        fillColor = '#fef3c7' // Yellow tint for generating
        strokeColor = '#f59e0b'
        break
      case 'error':
        fillColor = '#fee2e2' // Red tint for error
        strokeColor = '#ef4444'
        break
      case 'ready':
        fillColor = '#ffffff'
        strokeColor = '#e5e7eb'
        break
    }


    // Selection override
    if (isSelected || isMultiSelected) {
      strokeColor = '#007AFF' // Blue border for selection (iOS blue to match selection rectangle)
    }

    // Hover state
    if (viewState.isHovered) {
      fillColor = '#f9fafb' // Slightly darker on hover
    }

    return { fillColor, strokeColor, textColor }
  }, [idea.state, isSelected, viewState.isHovered])

  // Event handlers
  const handleMouseEnter = useCallback(() => {
    setViewState(prev => ({ ...prev, isHovered: true }))
  }, [])

  const handleMouseLeave = useCallback(() => {
    setViewState(prev => ({ ...prev, isHovered: false }))
  }, [])

  const handleClick = useCallback((e: any) => {
    const isCtrlPressed = e.evt?.ctrlKey || e.evt?.metaKey
    
    if (isCtrlPressed) {
      // Multi-select: toggle this idea in the selection
      if (isMultiSelected) {
        // Remove from selection
        const newSelection = Array.from(selectedIdeaIds).filter(id => id !== idea.id)
        setSelection(newSelection)
      } else {
        // Add to selection
        setSelection([...Array.from(selectedIdeaIds), idea.id])
      }
    } else {
      // Single select (old behavior for compatibility)
      selectIdea(idea.id)
      // Also set as the only selected idea
      setSelection([idea.id])
    }
  }, [selectIdea, idea.id, isMultiSelected, selectedIdeaIds, setSelection])

  const handleDragStart = useCallback((e: any) => {
    // Record initial positions of all selected ideas
    dragStartPositions.current.clear()
    
    if (isMultiSelected && selectedIdeaIds.size > 0) {
      // Record positions of all selected ideas
      selectedIdeaIds.forEach(id => {
        const selectedIdea = ideas[id]
        if (selectedIdea) {
          dragStartPositions.current.set(id, {
            x: selectedIdea.x || 0,
            y: selectedIdea.y || 0
          })
        }
      })
    } else {
      // Only this idea is being dragged
      dragStartPositions.current.set(idea.id, {
        x: idea.x || 0,
        y: idea.y || 0
      })
    }
  }, [isMultiSelected, selectedIdeaIds, ideas, idea.id, idea.x, idea.y])

  const handleDragMove = useCallback((e: any) => {
    if (!isMultiSelected || selectedIdeaIds.size === 0) return
    
    // Calculate delta from start position
    const currentPos = { x: e.target.x(), y: e.target.y() }
    const startPos = dragStartPositions.current.get(idea.id)
    if (!startPos) return
    
    const dx = currentPos.x - startPos.x
    const dy = currentPos.y - startPos.y
    
    // Apply delta to all selected ideas (optimistic update only)
    selectedIdeaIds.forEach(id => {
      if (id === idea.id) return // Skip the idea being dragged (Konva handles it)
      
      const startPosition = dragStartPositions.current.get(id)
      if (startPosition) {
        const newPos = {
          x: startPosition.x + dx,
          y: startPosition.y + dy
        }
        updateIdeaPosition(id, newPos)
      }
    })
  }, [isMultiSelected, selectedIdeaIds, idea.id, updateIdeaPosition])

  const handleDragEnd = useCallback((e: any) => {
    const newPosition = {
      x: e.target.x(),
      y: e.target.y()
    }
    
    if (isMultiSelected && selectedIdeaIds.size > 0) {
      // Start batch for multi-move (group all position updates into one undo)
      import('@/store').then(({ startBatch, endBatch }) => {
        startBatch()
        
        // Update all selected ideas (debounced batch API call will be triggered automatically)
        selectedIdeaIds.forEach(id => {
          const startPos = dragStartPositions.current.get(id)
          if (startPos) {
            const dx = newPosition.x - (dragStartPositions.current.get(idea.id)?.x || 0)
            const dy = newPosition.y - (dragStartPositions.current.get(idea.id)?.y || 0)
            
            updateIdeaPosition(id, {
              x: startPos.x + dx,
              y: startPos.y + dy
            })
          }
        })
        
        endBatch()
      })
    } else {
      // Single idea update (normal history tracking)
      updateIdeaPosition(idea.id, newPosition)
    }
    
    // Clear recorded positions
    dragStartPositions.current.clear()
  }, [updateIdeaPosition, idea.id, isMultiSelected, selectedIdeaIds])


  const dimensions = getDimensions()
  const colors = getColors()
  const displayText = getDisplayText()

  return (
    <Group
      ref={groupRef}
      x={idea.x || 0}
      y={idea.y || 0}
      draggable={activeModal !== 'help'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      ideaId={idea.id} // Custom attribute for finding during drop
    >
      {/* Main background rectangle */}
      <Rect
        width={dimensions.width}
        height={dimensions.height}
        fill={colors.fillColor}
        stroke={colors.strokeColor}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={8}
        shadowColor="rgba(0, 0, 0, 0.1)"
        shadowBlur={viewState.isHovered ? 8 : 4}
        shadowOffset={{ x: 0, y: 2 }}
        shadowOpacity={0.1}
      />

      {/* Loading indicator for generating state */}
      {idea.state === 'generating' && (
        <Rect
          width={dimensions.width}
          height={4}
          fill="#f59e0b"
          opacity={0.6}
          y={dimensions.height - 4}
          cornerRadius={[0, 0, 8, 8]}
        />
      )}

      {/* Text content */}
      <Text
        text={displayText}
        x={12}
        y={12}
        width={dimensions.width - 24}
        height={dimensions.height - 24}
        fontSize={viewState.isHovered ? 14 : 13}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={colors.textColor}
        wrap="word"
        verticalAlign="top"
        lineHeight={1.4}
      />

      {/* State indicator dots */}
      {idea.state === 'error' && (
        <Rect
          width={8}
          height={8}
          fill="#ef4444"
          x={dimensions.width - 16}
          y={8}
          cornerRadius={4}
        />
      )}

    </Group>
  )
}