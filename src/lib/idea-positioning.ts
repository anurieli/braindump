import type { IdeaDB } from '@/types'

const DEFAULT_IDEA_WIDTH = 200
const DEFAULT_IDEA_HEIGHT = 100
const IDEA_MARGIN = 40

function rectanglesOverlap(
  rectA: { left: number; right: number; top: number; bottom: number },
  rectB: { left: number; right: number; top: number; bottom: number }
): boolean {
  return !(
    rectA.right <= rectB.left ||
    rectA.left >= rectB.right ||
    rectA.bottom <= rectB.top ||
    rectA.top >= rectB.bottom
  )
}

function buildRect(x: number, y: number, width: number, height: number) {
  const margin = IDEA_MARGIN / 2
  return {
    left: x - margin,
    right: x + width + margin,
    top: y - margin,
    bottom: y + height + margin,
  }
}

function orderAngles(angleIncrement: number): number[] {
  const angles: number[] = [Math.PI / 2] // Prefer placing below first
  const steps = Math.floor((Math.PI * 2) / angleIncrement)

  for (let i = 1; i <= steps; i++) {
    const offset = angleIncrement * i
    angles.push((Math.PI / 2 + offset) % (Math.PI * 2))
    angles.push((Math.PI / 2 - offset + Math.PI * 2) % (Math.PI * 2))
  }

  return angles
}

export function findNonOverlappingPosition(
  ideas: Record<string, IdeaDB>,
  centerX: number,
  centerY: number,
  lastPlacedPosition: { x: number, y: number } | null = null,
  minDistance: number = 220,
  currentBrainDumpId?: string
): { x: number; y: number } {
  // Filter ideas to only those in current brain dump if specified
  const relevantIdeas = currentBrainDumpId 
    ? Object.values(ideas).filter(idea => idea.brain_dump_id === currentBrainDumpId)
    : Object.values(ideas)
    
  const existingIdeas = relevantIdeas.map(idea => ({ 
    x: idea.position_x, 
    y: idea.position_y,
    width: idea.width || DEFAULT_IDEA_WIDTH,
    height: idea.height || DEFAULT_IDEA_HEIGHT,
  }))
  
  // If no existing ideas, return center
  if (existingIdeas.length === 0) {
    return { x: centerX, y: centerY }
  }
  
  const positionIsClear = (x: number, y: number) => {
    const candidateRect = buildRect(x, y, DEFAULT_IDEA_WIDTH, DEFAULT_IDEA_HEIGHT)

    return existingIdeas.every(pos => {
      const ideaRect = buildRect(pos.x, pos.y, pos.width, pos.height)
      return !rectanglesOverlap(candidateRect, ideaRect)
    })
  }

  // If we have a last placed position, try to place slightly below it
  if (lastPlacedPosition) {
    const preferredY = lastPlacedPosition.y + 150 // Place 150px below the last idea
    const testPosition = { x: lastPlacedPosition.x, y: preferredY }
    
    // Check if this position is far enough from all existing ideas
    if (positionIsClear(testPosition.x, testPosition.y)) {
      return testPosition
    }

    const angleIncrement = Math.PI / 12 // 15 degrees
    const radiusIncrement = 40
    const angles = orderAngles(angleIncrement)
    const startRadius = Math.max(150, minDistance)
    const maxRadius = startRadius + 400

    for (let radius = startRadius; radius <= maxRadius; radius += radiusIncrement) {
      for (const angle of angles) {
        const candidateX = lastPlacedPosition.x + Math.cos(angle) * radius
        const candidateY = lastPlacedPosition.y + Math.sin(angle) * radius

        if (positionIsClear(candidateX, candidateY)) {
          return { x: candidateX, y: candidateY }
        }
      }
    }
  }
  
  // Try to find a spot in a spiral pattern
  let angle = 0
  let radius = minDistance
  const angleIncrement = Math.PI / 6 // 30 degrees
  const radiusIncrement = 40
  const maxAttempts = 100
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const testX = centerX + Math.cos(angle) * radius
    const testY = centerY + Math.sin(angle) * radius
    
    // Check if this position is far enough from all existing ideas
    if (positionIsClear(testX, testY)) {
      return { x: testX, y: testY }
    }
    
    // Spiral outward
    angle += angleIncrement
    if (angle > Math.PI * 2) {
      angle -= Math.PI * 2
      radius += radiusIncrement
    }
  }
  
  // Fallback: return a random position near the center
  return {
    x: centerX + (Math.random() - 0.5) * radius * 2,
    y: centerY + (Math.random() - 0.5) * radius * 2,
  }
}