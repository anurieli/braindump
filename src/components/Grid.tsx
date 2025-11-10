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

    // Base grid size (at zoom level 1)
    const baseGridSize = 50

    // Dynamic grid size calculation using logarithmic scaling
    // This creates smooth, continuous scaling across all zoom levels
    const logZoom = Math.log2(Math.max(0.01, zoom))
    const gridSize = baseGridSize * Math.pow(2, -logZoom)

    // Clamp grid size to reasonable bounds
    const clampedGridSize = Math.max(5, Math.min(2000, gridSize))

    // Dynamic opacity based on zoom level
    // More subtle when zoomed out, more prominent when zoomed in
    const opacity = Math.max(0.05, Math.min(0.6, 0.2 + logZoom * 0.1))

    // Choose render mode based on effective grid density
    // Lines work better when the grid would be too sparse or too dense
    const effectiveDensity = (clampedGridSize * zoom)
    const renderMode: 'dots' | 'lines' = effectiveDensity < 15 || effectiveDensity > 200 ? 'lines' : 'dots'

    // Calculate the visible area in world coordinates
    const viewLeft = -x / zoom
    const viewTop = -y / zoom
    const viewRight = viewLeft + stageWidth / zoom
    const viewBottom = viewTop + stageHeight / zoom

    // Calculate grid boundaries with some padding
    const padding = clampedGridSize * 2
    const startX = Math.floor((viewLeft - padding) / clampedGridSize) * clampedGridSize
    const endX = Math.ceil((viewRight + padding) / clampedGridSize) * clampedGridSize
    const startY = Math.floor((viewTop - padding) / clampedGridSize) * clampedGridSize
    const endY = Math.ceil((viewBottom + padding) / clampedGridSize) * clampedGridSize

    const elements: React.ReactNode[] = []

    if (renderMode === 'dots') {
      // Render dots with dynamic sizing
      let dotIndex = 0
      for (let gridX = startX; gridX <= endX; gridX += clampedGridSize) {
        for (let gridY = startY; gridY <= endY; gridY += clampedGridSize) {
          // Dynamic dot radius based on zoom and grid size
          const dotRadius = Math.max(0.5, Math.min(3, clampedGridSize / 50))
          elements.push(
            <Circle
              key={`dot-${dotIndex++}`}
              x={gridX}
              y={gridY}
              radius={dotRadius}
              fill="#94a3b8"
              opacity={opacity}
            />
          )
        }
      }
    } else {
      // Render lines for better visibility at extreme zoom levels
      let lineIndex = 0

      // Dynamic line width based on zoom level
      const lineWidth = Math.max(0.2, Math.min(2, 0.5 * Math.sqrt(clampedGridSize / 50)))

      // Vertical lines
      for (let gridX = startX; gridX <= endX; gridX += clampedGridSize) {
        elements.push(
          <Line
            key={`vline-${lineIndex++}`}
            points={[gridX, startY, gridX, endY]}
            stroke="#94a3b8"
            strokeWidth={lineWidth}
            opacity={opacity}
          />
        )
      }

      // Horizontal lines
      for (let gridY = startY; gridY <= endY; gridY += clampedGridSize) {
        elements.push(
          <Line
            key={`hline-${lineIndex++}`}
            points={[startX, gridY, endX, gridY]}
            stroke="#94a3b8"
            strokeWidth={lineWidth}
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