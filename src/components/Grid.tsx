'use client'

import { useMemo } from 'react'
import { Group, Circle, Line } from 'react-konva'

interface GridProps {
  viewport: {
    x: number
    y: number
    zoom: number
  }
  stageWidth: number
  stageHeight: number
  visible?: boolean
}

export default function Grid({ viewport, stageWidth, stageHeight, visible = true }: GridProps) {
  const gridElements = useMemo(() => {
    if (!visible) return null

    const { x, y, zoom } = viewport
    
    // Calculate base grid size based on zoom level
    const baseGridSize = 50
    let gridSize = baseGridSize
    let opacity = 0.3

    // Adjust grid density and opacity based on zoom level
    if (zoom < 0.5) {
      gridSize = baseGridSize * 4
      opacity = 0.15
    } else if (zoom < 1) {
      gridSize = baseGridSize * 2
      opacity = 0.2
    } else if (zoom > 2) {
      gridSize = baseGridSize / 2
      opacity = 0.4
    } else if (zoom > 4) {
      gridSize = baseGridSize / 4
      opacity = 0.5
    }

    // Calculate the visible area in world coordinates
    const viewLeft = -x / zoom
    const viewTop = -y / zoom
    const viewRight = viewLeft + stageWidth / zoom
    const viewBottom = viewTop + stageHeight / zoom

    // Calculate grid boundaries with some padding
    const padding = gridSize * 2
    const startX = Math.floor((viewLeft - padding) / gridSize) * gridSize
    const endX = Math.ceil((viewRight + padding) / gridSize) * gridSize
    const startY = Math.floor((viewTop - padding) / gridSize) * gridSize
    const endY = Math.ceil((viewBottom + padding) / gridSize) * gridSize

    const elements: React.ReactNode[] = []

    // Choose rendering style based on zoom level
    if (zoom >= 1) {
      // Render dots at higher zoom levels
      let dotIndex = 0
      for (let x = startX; x <= endX; x += gridSize) {
        for (let y = startY; y <= endY; y += gridSize) {
          elements.push(
            <Circle
              key={`dot-${dotIndex++}`}
              x={x}
              y={y}
              radius={Math.max(0.5, 1 * zoom)}
              fill="#94a3b8"
              opacity={opacity}
            />
          )
        }
      }
    } else {
      // Render lines at lower zoom levels for better performance
      let lineIndex = 0
      
      // Vertical lines
      for (let x = startX; x <= endX; x += gridSize) {
        elements.push(
          <Line
            key={`vline-${lineIndex++}`}
            points={[x, startY, x, endY]}
            stroke="#94a3b8"
            strokeWidth={0.5 / zoom}
            opacity={opacity}
          />
        )
      }
      
      // Horizontal lines
      for (let y = startY; y <= endY; y += gridSize) {
        elements.push(
          <Line
            key={`hline-${lineIndex++}`}
            points={[startX, y, endX, y]}
            stroke="#94a3b8"
            strokeWidth={0.5 / zoom}
            opacity={opacity}
          />
        )
      }
    }

    return elements
  }, [viewport, stageWidth, stageHeight, visible])

  if (!visible || !gridElements) {
    return null
  }

  return (
    <Group listening={false}>
      {gridElements}
    </Group>
  )
}