import type { Idea } from '@/types';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Check if a point is inside a rectangle
export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

// Check if two rectangles intersect
export function rectsIntersect(rect1: Rect, rect2: Rect): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

// Get the center point of a rectangle
export function getRectCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

// Calculate distance between two points
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Get the nearest point on a rectangle's edge to a given point
export function nearestPointOnRect(point: Point, rect: Rect): Point {
  const center = getRectCenter(rect);
  
  // Calculate the angle from center to point
  const angle = Math.atan2(point.y - center.y, point.x - center.x);
  
  // Calculate intersection with rectangle edges
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  
  // Determine which edge the line intersects
  const tanAngle = Math.tan(angle);
  
  if (Math.abs(tanAngle) < halfHeight / halfWidth) {
    // Intersects left or right edge
    const x = angle > -Math.PI / 2 && angle < Math.PI / 2
      ? rect.x + rect.width
      : rect.x;
    const y = center.y + (x - center.x) * tanAngle;
    return { x, y };
  } else {
    // Intersects top or bottom edge
    const y = angle > 0 ? rect.y + rect.height : rect.y;
    const x = center.x + (y - center.y) / tanAngle;
    return { x, y };
  }
}

// Calculate control points for a curved edge (quadratic bezier)
export function getEdgeControlPoint(start: Point, end: Point): Point {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  
  // Offset perpendicular to the line
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  // Curve amount based on distance
  const curvature = Math.min(dist * 0.3, 100);
  
  // Perpendicular offset
  const offsetX = (-dy / dist) * curvature;
  const offsetY = (dx / dist) * curvature;
  
  return {
    x: midX + offsetX,
    y: midY + offsetY,
  };
}

// Generate SVG path for a curved edge
export function generateEdgePath(sourceIdea: Idea, targetIdea: Idea): string {
  const sourceRect: Rect = {
    x: sourceIdea.x,
    y: sourceIdea.y,
    width: sourceIdea.width || 200,
    height: sourceIdea.height || 100,
  };
  
  const targetRect: Rect = {
    x: targetIdea.x,
    y: targetIdea.y,
    width: targetIdea.width || 200,
    height: targetIdea.height || 100,
  };
  
  const sourceCenter = getRectCenter(sourceRect);
  const targetCenter = getRectCenter(targetRect);
  
  const start = nearestPointOnRect(targetCenter, sourceRect);
  const end = nearestPointOnRect(sourceCenter, targetRect);
  
  const controlPoint = getEdgeControlPoint(start, end);
  
  return `M ${start.x} ${start.y} Q ${controlPoint.x} ${controlPoint.y} ${end.x} ${end.y}`;
}

// Find a free position for a new idea (spiral placement)
export function findFreePosition(
  existingIdeas: Idea[],
  centerX: number,
  centerY: number,
  width = 200,
  height = 100
): Point {
  if (existingIdeas.length === 0) {
    return { x: centerX - width / 2, y: centerY - height / 2 };
  }
  
  const spacing = 50;
  const radius = 150;
  let angle = 0;
  let currentRadius = radius;
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const x = centerX + Math.cos(angle) * currentRadius - width / 2;
    const y = centerY + Math.sin(angle) * currentRadius - height / 2;
    
    const testRect: Rect = { x, y, width, height };
    
    // Check if this position overlaps with any existing ideas
    const hasOverlap = existingIdeas.some(idea => {
      const ideaRect: Rect = {
        x: idea.x,
        y: idea.y,
        width: idea.width || 200,
        height: idea.height || 100,
      };
      
      // Add spacing to the check
      const expandedRect: Rect = {
        x: ideaRect.x - spacing,
        y: ideaRect.y - spacing,
        width: ideaRect.width + spacing * 2,
        height: ideaRect.height + spacing * 2,
      };
      
      return rectsIntersect(testRect, expandedRect);
    });
    
    if (!hasOverlap) {
      return { x, y };
    }
    
    // Spiral outward
    angle += Math.PI / 4; // 45 degrees
    if (angle >= Math.PI * 2) {
      angle = 0;
      currentRadius += spacing;
    }
    
    attempts++;
  }
  
  // Fallback: place at center with random offset
  return {
    x: centerX + (Math.random() - 0.5) * 400,
    y: centerY + (Math.random() - 0.5) * 400,
  };
}

// Convert screen coordinates to canvas coordinates
export function screenToCanvas(
  screenX: number,
  screenY: number,
  panX: number,
  panY: number,
  zoom: number
): Point {
  return {
    x: (screenX - panX) / zoom,
    y: (screenY - panY) / zoom,
  };
}

// Convert canvas coordinates to screen coordinates
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  panX: number,
  panY: number,
  zoom: number
): Point {
  return {
    x: canvasX * zoom + panX,
    y: canvasY * zoom + panY,
  };
}

// Check if a line segment intersects with a rectangle
export function lineIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): boolean {
  // Check if either endpoint is inside the rectangle
  if (pointInRect({ x: x1, y: y1 }, { x: rectX, y: rectY, width: rectWidth, height: rectHeight }) ||
      pointInRect({ x: x2, y: y2 }, { x: rectX, y: rectY, width: rectWidth, height: rectHeight })) {
    return true;
  }

  // Check if line intersects any of the rectangle's edges
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  // Check if line's bounding box intersects rectangle
  if (maxX < rectX || minX > rectX + rectWidth || maxY < rectY || minY > rectY + rectHeight) {
    return false;
  }

  // Check if line intersects rectangle edges (simplified check)
  // For a more accurate check, we'd need to test against all 4 edges
  // This simplified version works well for selection boxes
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Check intersection with left edge
  if (dx !== 0) {
    const t = (rectX - x1) / dx;
    if (t >= 0 && t <= 1) {
      const y = y1 + t * dy;
      if (y >= rectY && y <= rectY + rectHeight) return true;
    }
  }

  // Check intersection with right edge
  if (dx !== 0) {
    const t = (rectX + rectWidth - x1) / dx;
    if (t >= 0 && t <= 1) {
      const y = y1 + t * dy;
      if (y >= rectY && y <= rectY + rectHeight) return true;
    }
  }

  // Check intersection with top edge
  if (dy !== 0) {
    const t = (rectY - y1) / dy;
    if (t >= 0 && t <= 1) {
      const x = x1 + t * dx;
      if (x >= rectX && x <= rectX + rectWidth) return true;
    }
  }

  // Check intersection with bottom edge
  if (dy !== 0) {
    const t = (rectY + rectHeight - y1) / dy;
    if (t >= 0 && t <= 1) {
      const x = x1 + t * dx;
      if (x >= rectX && x <= rectX + rectWidth) return true;
    }
  }

  return false;
}

// Task 13: Enhanced collision detection for drag and drop
export interface IdeaRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Calculate overlap percentage between two rectangles (0-1)
export function calculateOverlapPercentage(rect1: Rect, rect2: Rect): number {
  if (!rectsIntersect(rect1, rect2)) {
    return 0;
  }
  
  const overlapLeft = Math.max(rect1.x, rect2.x);
  const overlapRight = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
  const overlapTop = Math.max(rect1.y, rect2.y);
  const overlapBottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
  
  const overlapWidth = overlapRight - overlapLeft;
  const overlapHeight = overlapBottom - overlapTop;
  const overlapArea = overlapWidth * overlapHeight;
  
  const rect1Area = rect1.width * rect1.height;
  const rect2Area = rect2.width * rect2.height;
  const smallerArea = Math.min(rect1Area, rect2Area);
  
  return overlapArea / smallerArea;
}

// Detect collision between a dragged idea and other ideas
export function detectCollision(
  draggedIdea: IdeaRect,
  otherIdeas: IdeaRect[],
  touchThreshold = 0.1,  // 10% overlap for touch detection
  mergeThreshold = 0.4   // 40% overlap for merge detection
): {
  touchedIdeas: string[];
  mergeCandidate: string | null;
} {
  const touchedIdeas: string[] = [];
  let mergeCandidate: string | null = null;
  let maxOverlap = 0;
  
  const draggedRect: Rect = {
    x: draggedIdea.x,
    y: draggedIdea.y,
    width: draggedIdea.width,
    height: draggedIdea.height
  };
  
  otherIdeas.forEach(idea => {
    if (idea.id === draggedIdea.id) return; // Skip self
    
    const otherRect: Rect = {
      x: idea.x,
      y: idea.y,
      width: idea.width,
      height: idea.height
    };
    
    const overlapPercentage = calculateOverlapPercentage(draggedRect, otherRect);
    
    if (overlapPercentage >= touchThreshold) {
      touchedIdeas.push(idea.id);
      
      // Track the idea with maximum overlap for potential merging
      if (overlapPercentage >= mergeThreshold && overlapPercentage > maxOverlap) {
        maxOverlap = overlapPercentage;
        mergeCandidate = idea.id;
      }
    }
  });
  
  return { touchedIdeas, mergeCandidate };
}

// Throttled collision detection to improve performance during drag
export class CollisionDetector {
  private lastCheck = 0;
  private throttleMs: number;
  
  constructor(throttleMs = 16) { // ~60fps
    this.throttleMs = throttleMs;
  }
  
  checkCollision(
    draggedIdea: IdeaRect,
    otherIdeas: IdeaRect[],
    touchThreshold?: number,
    mergeThreshold?: number
  ): { touchedIdeas: string[]; mergeCandidate: string | null } | null {
    const now = Date.now();
    if (now - this.lastCheck < this.throttleMs) {
      return null; // Skip this check due to throttling
    }
    
    this.lastCheck = now;
    return detectCollision(draggedIdea, otherIdeas, touchThreshold, mergeThreshold);
  }
}

// Convert IdeaDB to IdeaRect for collision detection
export function ideaToRect(idea: { id: string; position_x: number; position_y: number; width?: number; height?: number }): IdeaRect {
  return {
    id: idea.id,
    x: idea.position_x,
    y: idea.position_y,
    width: idea.width || 200,
    height: idea.height || 100
  };
}

