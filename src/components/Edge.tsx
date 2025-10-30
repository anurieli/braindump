import React from 'react'
import { Arrow, Group } from 'react-konva'
import { Edge as EdgeType } from '@/types'

interface EdgeProps {
  edge: EdgeType
  startPos: { x: number; y: number }
  endPos: { x: number; y: number }
  onDelete?: (edgeId: string) => void
  onDoubleClick?: (edge: EdgeType) => void
  onClick?: (edgeId: string) => void
  isSelected?: boolean
}

export default function Edge({
  edge,
  startPos,
  endPos,
  onDelete,
  onDoubleClick,
  onClick,
  isSelected = false
}: EdgeProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  // Calculate arrow points
  const points = [startPos.x, startPos.y, endPos.x, endPos.y]

  // Calculate midpoint for interaction zone
  const midX = (startPos.x + endPos.x) / 2
  const midY = (startPos.y + endPos.y) / 2

  const handleMouseEnter = () => {
    setIsHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    document.body.style.cursor = 'default'
  }

  const handleClick = (e: any) => {
    e.cancelBubble = true
    
    // If shift/cmd is held, delete the edge
    if ((e.evt.shiftKey || e.evt.metaKey) && onDelete) {
      onDelete(edge.id)
    } else if (onClick) {
      // Normal click - select the edge
      onClick(edge.id)
    }
  }

  const handleDoubleClick = (e: any) => {
    e.cancelBubble = true
    if (onDoubleClick) {
      onDoubleClick(edge)
    }
  }

  // Determine stroke color based on state
  const getStrokeColor = () => {
    if (isSelected) return '#3B82F6' // blue-500
    if (isHovered) return '#6B7280' // gray-500
    return '#D1D5DB' // gray-300
  }

  return (
    <Group>
      {/* Main arrow */}
      <Arrow
        points={points}
        stroke={getStrokeColor()}
        strokeWidth={isHovered || isSelected ? 3 : 2}
        fill={getStrokeColor()}
        pointerLength={10}
        pointerWidth={10}
        lineCap="round"
        lineJoin="round"
        tension={0}
        dash={edge.type === 'tentative' ? [5, 5] : undefined}
        opacity={isHovered || isSelected ? 1 : 0.7}
      />

      {/* Invisible hit area for better interaction */}
      <Arrow
        points={points}
        stroke="transparent"
        strokeWidth={20}
        fill="transparent"
        pointerLength={0}
        pointerWidth={0}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onDblClick={handleDoubleClick}
      />

      {/* Delete indicator when hovering */}
      {isHovered && onDelete && (
        <Group x={midX} y={midY}>
          {/* Background circle */}
          <Arrow
            x={0}
            y={0}
            points={[0, 0, 0, 0]}
            stroke="#EF4444"
            strokeWidth={0}
            fill="#EF4444"
            width={20}
            height={20}
          />
        </Group>
      )}
    </Group>
  )
}