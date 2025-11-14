/**
 * Centralized debug logging infrastructure for undo/redo system
 * Provides structured logging, state snapshots, and operation flow tracking
 */

interface DebugLogEntry {
  timestamp: number
  operation: string
  component: string
  action: string
  data?: any
  state?: {
    ideasCount: number
    edgesCount: number
    historyLength: number
    currentHistoryIndex: number
  }
  duration?: number
}

class UndoRedoDebugger {
  private logs: DebugLogEntry[] = []
  private operationStack: string[] = []
  private enabled = true
  private maxLogs = 1000

  // Color-coded log levels for better visibility
  private colors = {
    operation: '#3b82f6',    // Blue - operation flow
    state: '#10b981',        // Green - state changes
    keyboard: '#f59e0b',     // Amber - keyboard events
    error: '#ef4444',        // Red - errors
    success: '#22c55e',      // Green - success
    warning: '#f97316'       // Orange - warnings
  }

  constructor() {
    // Bind to window for easy debugging access
    if (typeof window !== 'undefined') {
      (window as any).undoDebug = this
    }
  }

  private log(level: keyof typeof UndoRedoDebugger.prototype.colors, message: string, data?: any) {
    if (!this.enabled) return

    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      operation: this.operationStack[this.operationStack.length - 1] || 'unknown',
      component: 'undo-debug',
      action: message,
      data
    }

    this.logs.push(entry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    const color = this.colors[level]
    const prefix = `%c[${new Date(entry.timestamp).toLocaleTimeString()}] ${level.toUpperCase()}:`

    console.log(`${prefix} ${message}`, `color: ${color}; font-weight: bold;`)

    if (data) {
      console.log('📊 Data:', data)
    }
  }

  // Operation tracking
  startOperation(operation: string, component: string) {
    this.operationStack.push(operation)
    this.log('operation', `▶️ Started: ${operation}`, { component })
  }

  endOperation(success = true, data?: any) {
    const operation = this.operationStack.pop()
    if (operation) {
      this.log(success ? 'success' : 'error', `⏹️ Ended: ${operation}`, data)
    }
  }

  // State change tracking
  logStateChange(action: string, beforeState?: any, afterState?: any) {
    const state = {
      ideasCount: afterState?.ideas ? Object.keys(afterState.ideas).length : 0,
      edgesCount: afterState?.edges ? Object.keys(afterState.edges).length : 0,
      historyLength: 0,
      currentHistoryIndex: -1
    }

    this.log('state', `🔄 State: ${action}`, {
      before: beforeState ? {
        ideasCount: Object.keys(beforeState.ideas || {}).length,
        edgesCount: Object.keys(beforeState.edges || {}).length
      } : null,
      after: state,
      diff: beforeState && afterState ? this.calculateDiff(beforeState, afterState) : null
    })
  }

  // History tracking
  logHistoryAction(action: string, state: any, isImmediate = false) {
    const historyState = {
      ideasCount: Object.keys(state.ideas).length,
      edgesCount: Object.keys(state.edges).length,
      historyLength: this.logs.filter(l => l.action.includes('History')).length,
      currentHistoryIndex: -1
    }

    this.log('state', `💾 ${action} ${isImmediate ? '(IMMEDIATE)' : '(DEBOUNCED)'}`, historyState)
  }

  // Keyboard event tracking
  logKeyboardEvent(key: string, action: string, canPerform: boolean) {
    this.log('keyboard', `🎹 ${key}: ${action}`, { canPerform })
  }

  // Error tracking
  logError(operation: string, error: any, context?: any) {
    this.log('error', `❌ Error in ${operation}`, { error: error.message || error, context })
  }

  // Performance tracking
  timeOperation<T>(operation: string, fn: () => T): T {
    const start = performance.now()
    this.startOperation(operation, 'performance')

    try {
      const result = fn()
      const duration = performance.now() - start
      this.endOperation(true, { duration: `${duration.toFixed(2)}ms` })
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.endOperation(false, { duration: `${duration.toFixed(2)}ms`, error })
      throw error
    }
  }

  // State validation
  validateState(state: any): { valid: boolean, errors: string[] } {
    const errors: string[] = []

    // Check for orphaned edges (edges referencing non-existent ideas)
    if (state.edges) {
      Object.values(state.edges).forEach((edge: any) => {
        if (!state.ideas?.[edge.parent_id]) {
          errors.push(`Edge ${edge.id} references non-existent parent ${edge.parent_id}`)
        }
        if (!state.ideas?.[edge.child_id]) {
          errors.push(`Edge ${edge.id} references non-existent child ${edge.child_id}`)
        }
      })
    }

    // Check for circular references (basic check)
    if (state.edges) {
      const edges = Object.values(state.edges) as any[]
      const visited = new Set<string>()
      const recursionStack = new Set<string>()

      const hasCycle = (ideaId: string): boolean => {
        if (recursionStack.has(ideaId)) return true
        if (visited.has(ideaId)) return false

        visited.add(ideaId)
        recursionStack.add(ideaId)

        const childEdges = edges.filter(e => e.parent_id === ideaId)
        for (const edge of childEdges) {
          if (hasCycle(edge.child_id)) return true
        }

        recursionStack.delete(ideaId)
        return false
      }

      for (const ideaId of Object.keys(state.ideas || {})) {
        if (hasCycle(ideaId)) {
          errors.push(`Circular reference detected starting from idea ${ideaId}`)
          break
        }
      }
    }

    const valid = errors.length === 0
    if (!valid) {
      this.log('error', 'State validation failed', { errors })
    }

    return { valid, errors }
  }

  private calculateDiff(before: any, after: any): any {
    const diff: any = {}

    // Ideas diff
    const beforeIdeas = Object.keys(before.ideas || {})
    const afterIdeas = Object.keys(after.ideas || {})
    const addedIdeas = afterIdeas.filter(id => !beforeIdeas.includes(id))
    const removedIdeas = beforeIdeas.filter(id => !afterIdeas.includes(id))

    if (addedIdeas.length > 0) diff.addedIdeas = addedIdeas
    if (removedIdeas.length > 0) diff.removedIdeas = removedIdeas

    // Edges diff
    const beforeEdges = Object.keys(before.edges || {})
    const afterEdges = Object.keys(after.edges || {})
    const addedEdges = afterEdges.filter(id => !beforeEdges.includes(id))
    const removedEdges = beforeEdges.filter(id => !afterEdges.includes(id))

    if (addedEdges.length > 0) diff.addedEdges = addedEdges
    if (removedEdges.length > 0) diff.removedEdges = removedEdges

    return Object.keys(diff).length > 0 ? diff : null
  }

  // Utility methods
  clearLogs() {
    this.logs = []
    this.log('operation', '🧹 Debug logs cleared')
  }

  getLogs(filter?: { operation?: string, component?: string, action?: string }): DebugLogEntry[] {
    let filtered = this.logs

    if (filter) {
      filtered = filtered.filter(log =>
        (!filter.operation || log.operation.includes(filter.operation)) &&
        (!filter.component || log.component.includes(filter.component)) &&
        (!filter.action || log.action.includes(filter.action))
      )
    }

    return filtered
  }

  getSummary(): any {
    const logs = this.logs
    const operations = [...new Set(logs.map(l => l.operation))]
    const components = [...new Set(logs.map(l => l.component))]
    const errors = logs.filter(l => l.action.includes('Error') || l.action.includes('❌'))

    return {
      totalLogs: logs.length,
      operations,
      components,
      errors: errors.length,
      timeRange: logs.length > 0 ? {
        start: new Date(logs[0].timestamp).toLocaleTimeString(),
        end: new Date(logs[logs.length - 1].timestamp).toLocaleTimeString(),
        duration: logs.length > 1 ? logs[logs.length - 1].timestamp - logs[0].timestamp : 0
      } : null
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    this.log('operation', `🔧 Debug logging ${enabled ? 'enabled' : 'disabled'}`)
  }
}

// Create singleton instance
export const undoDebugger = new UndoRedoDebugger()

// Convenience functions for easy use
export const debugOperation = (operation: string, component: string) => undoDebugger.startOperation(operation, component)
export const debugEnd = (success = true, data?: any) => undoDebugger.endOperation(success, data)
export const debugState = (action: string, before?: any, after?: any) => undoDebugger.logStateChange(action, before, after)
export const debugHistory = (action: string, state: any, isImmediate = false) => undoDebugger.logHistoryAction(action, state, isImmediate)
export const debugKeyboard = (key: string, action: string, canPerform: boolean) => undoDebugger.logKeyboardEvent(key, action, canPerform)
export const debugError = (operation: string, error: any, context?: any) => undoDebugger.logError(operation, error, context)
export const debugTime = <T>(operation: string, fn: () => T): T => undoDebugger.timeOperation(operation, fn)
export const validateState = (state: any) => undoDebugger.validateState(state)

// Global access for debugging
if (typeof window !== 'undefined') {
  (window as any).debugUndo = {
    logs: () => undoDebugger.getLogs(),
    summary: () => undoDebugger.getSummary(),
    clear: () => undoDebugger.clearLogs(),
    validate: (state: any) => undoDebugger.validateState(state),
    enable: () => undoDebugger.setEnabled(true),
    disable: () => undoDebugger.setEnabled(false)
  }
}
