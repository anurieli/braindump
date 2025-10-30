// Debounce utility for batching position updates to database

interface PositionUpdate {
  id: string
  position_x: number
  position_y: number
}

class PositionDebouncer {
  private pending: Map<string, PositionUpdate> = new Map()
  private timeout: NodeJS.Timeout | null = null
  private delay: number

  constructor(delay = 300) {
    this.delay = delay
  }

  add(id: string, position_x: number, position_y: number) {
    this.pending.set(id, { id, position_x, position_y })
    
    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    this.timeout = setTimeout(() => {
      this.flush()
    }, this.delay)
  }

  private async flush() {
    if (this.pending.size === 0) return

    const updates = Array.from(this.pending.values())
    this.pending.clear()

    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Batch update all positions
      for (const update of updates) {
        await supabase
          .from('ideas')
          .update({ 
            position_x: update.position_x, 
            position_y: update.position_y 
          })
          .eq('id', update.id)
      }
    } catch (error) {
      console.error('Failed to save position updates:', error)
    }
  }

  cancel() {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
    this.pending.clear()
  }
}

export const positionDebouncer = new PositionDebouncer(300)

// General purpose debounce utility
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}