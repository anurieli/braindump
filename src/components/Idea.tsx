'use client'

import { useState, useCallback, useRef } from 'react'
import { Group, Rect, Text, Circle } from 'react-konva'
import { Idea as IdeaType } from '@/types'
import { useStore } from '@/store'

interface IdeaProps {
  idea: IdeaType
  onStartConnection?: (ideaId: string, position: { x: number, y: number }) => void
  onEndConnection?: (targetId: string) => void
  isDragTarget?: boolean
  hasChildren?: boolean
}

interface ViewState {
  isHovered: boolean
  isSelected: boolean
  isDraggingConnection: boolean
  isDropTarget: boolean
}

export default function Idea({ 
  idea,
  onStartConnection,
  onEndConnection,
  isDragTarget = false,
  hasChildren = false
}: IdeaProps) {
  const [viewState, setViewState] = useState<ViewState>({
    isHovered: false,
    isSelected: false,
    isDraggingConnection: false,
    isDropTarget: false
  })
  const groupRef = useRef<any>(null)

  // Store selectors
  const selectedIdeaId = useStore(state => state.selectedIdeaId)
  const selectIdea = useStore(state => state.selectIdea)
  const updateIdeaPosition = useStore(state => state.updateIdeaPosition)

  // Check if this idea is selected
  const isSelected = selectedIdeaId === idea.id

  // Determine which text to display based on view state
  const getDisplayText = useCallback(() => {
    const text = idea.text || 'Loading...'
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
  }, [viewState.isHovered, idea.text, idea.summary])

  // Calculate dynamic dimensions based on text and view state
  const getDimensions = useCallback(() => {
    const baseWidth = idea.width || 200
    const baseHeight = idea.height || 100
    const text = idea.text || ''
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
  }, [viewState.isHovered, idea.width, idea.height, idea.text, idea.summary])

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

    // Drop target highlight
    if (viewState.isDropTarget || isDragTarget) {
      fillColor = '#dbeafe' // Light blue for drop target
      strokeColor = '#60a5fa'
    }

    // Parent indicator (gold stroke)
    if (hasChildren) {
      strokeColor = '#f59e0b' // Gold for parent nodes
    }

    // Selection override
    if (isSelected) {
      strokeColor = '#3b82f6' // Blue border for selection
    }

    // Hover state
    if (viewState.isHovered && !viewState.isDropTarget) {
      fillColor = '#f9fafb' // Slightly darker on hover
    }

    return { fillColor, strokeColor, textColor }
  }, [idea.state, isSelected, viewState.isHovered, viewState.isDropTarget, isDragTarget, hasChildren])

  // Event handlers
  const handleMouseEnter = useCallback(() => {
    setViewState(prev => ({ ...prev, isHovered: true }))
  }, [])

  const handleMouseLeave = useCallback(() => {
    setViewState(prev => ({ ...prev, isHovered: false }))
  }, [])

  const handleClick = useCallback(() => {
    selectIdea(idea.id)
  }, [selectIdea, idea.id])

  const handleDragEnd = useCallback((e: { target: { x: () => number, y: () => number } }) => {
    const newPosition = {
      x: e.target.x(),
      y: e.target.y()
    }
    updateIdeaPosition(idea.id, newPosition)
  }, [updateIdeaPosition, idea.id])

  const dimensions = getDimensions()
  const colors = getColors()
  const displayText = getDisplayText()

  return (
    <Group
      x={idea.position_x || 0}
      y={idea.position_y || 0}
      draggable={true}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDragEnd={handleDragEnd}
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