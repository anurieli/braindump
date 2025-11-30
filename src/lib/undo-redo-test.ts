/**
 * Comprehensive test suite for undo/redo functionality
 * Tests each canvas operation type systematically
 */

import { useStore } from '@/store'
import { undoDebugger } from './undo-debug'

interface TestResult {
  testName: string
  passed: boolean
  error?: string
  details?: any
}

class UndoRedoTester {
  private results: TestResult[] = []
  private store = useStore.getState()

  constructor() {
    // Bind to window for easy testing access
    if (typeof window !== 'undefined') {
      (window as any).undoRedoTester = this
    }
  }

  private async addTestResult(testName: string, testFn: () => Promise<boolean> | boolean) {
    try {
      const result = await testFn()
      this.results.push({ testName, passed: result })
      console.log(`✅ ${testName}: PASSED`)
      return result
    } catch (error) {
      this.results.push({ testName, passed: false, error: error.message })
      console.error(`❌ ${testName}: FAILED`, error)
      return false
    }
  }

  private getStateSnapshot() {
    const state = useStore.getState()
    return {
      ideasCount: Object.keys(state.ideas).length,
      edgesCount: Object.keys(state.edges).length,
      ideas: JSON.parse(JSON.stringify(state.ideas)),
      edges: JSON.parse(JSON.stringify(state.edges))
    }
  }

  private async waitForState(timeoutMs = 1000) {
    return new Promise(resolve => setTimeout(resolve, timeoutMs))
  }

  // Test 1: Basic idea creation and undo
  async testBasicIdeaCreation() {
    return this.addTestResult('Basic Idea Creation and Undo', async () => {
      const initialState = this.getStateSnapshot()
      undoDebugger.startOperation('test-idea-creation', 'tester')

      // Create a new idea
      const ideaId = await useStore.getState().addIdea('Test idea for undo testing', { x: 100, y: 100 })
      await this.waitForState(200)
      
      const afterCreate = this.getStateSnapshot()
      
      // Verify idea was created
      if (afterCreate.ideasCount !== initialState.ideasCount + 1) {
        throw new Error(`Expected ${initialState.ideasCount + 1} ideas, got ${afterCreate.ideasCount}`)
      }

      if (!afterCreate.ideas[ideaId]) {
        throw new Error('Created idea not found in state')
      }

      // Test undo
      const undoState = (useStore.getState() as any).undoRedoManager?.undo()
      if (!undoState) {
        throw new Error('Undo returned null - no history available')
      }

      // Apply undo state
      useStore.setState({ ideas: undoState.ideas, edges: undoState.edges })
      await this.waitForState(100)

      const afterUndo = this.getStateSnapshot()
      
      // Verify undo worked
      if (afterUndo.ideasCount !== initialState.ideasCount) {
        throw new Error(`Expected ${initialState.ideasCount} ideas after undo, got ${afterUndo.ideasCount}`)
      }

      if (afterUndo.ideas[ideaId]) {
        throw new Error('Idea still exists after undo')
      }

      undoDebugger.endOperation(true, { idealId, initialState, afterCreate, afterUndo })
      return true
    })
  }

  // Test 2: Edge creation and undo
  async testBasicEdgeCreation() {
    return this.addTestResult('Basic Edge Creation and Undo', async () => {
      const initialState = this.getStateSnapshot()
      undoDebugger.startOperation('test-edge-creation', 'tester')

      // Create two ideas first
      const parentId = await useStore.getState().addIdea('Parent idea', { x: 100, y: 100 })
      const childId = await useStore.getState().addIdea('Child idea', { x: 200, y: 200 })
      await this.waitForState(200)

      const afterIdeas = this.getStateSnapshot()

      // Create an edge
      const edgeId = await useStore.getState().addEdge(parentId, childId, 'relates-to', 'Test edge')
      await this.waitForState(200)

      const afterEdge = this.getStateSnapshot()

      // Verify edge was created
      if (afterEdge.edgesCount !== afterIdeas.edgesCount + 1) {
        throw new Error(`Expected ${afterIdeas.edgesCount + 1} edges, got ${afterEdge.edgesCount}`)
      }

      if (!afterEdge.edges[edgeId]) {
        throw new Error('Created edge not found in state')
      }

      // Test undo
      const undoState = (useStore.getState() as any).undoRedoManager?.undo()
      if (!undoState) {
        throw new Error('Undo returned null - no history available')
      }

      // Apply undo state
      useStore.setState({ ideas: undoState.ideas, edges: undoState.edges })
      await this.waitForState(100)

      const afterUndo = this.getStateSnapshot()

      // Verify edge was removed
      if (afterUndo.edgesCount !== afterIdeas.edgesCount) {
        throw new Error(`Expected ${afterIdeas.edgesCount} edges after undo, got ${afterUndo.edgesCount}`)
      }

      if (afterUndo.edges[edgeId]) {
        throw new Error('Edge still exists after undo')
      }

      undoDebugger.endOperation(true, { parentId, childId, edgeId, afterEdge, afterUndo })
      return true
    })
  }

  // Test 3: Atomic idea+edge creation (auto-relate mode)
  async testAtomicIdeaEdgeCreation() {
    return this.addTestResult('Atomic Idea+Edge Creation and Undo', async () => {
      const initialState = this.getStateSnapshot()
      undoDebugger.startOperation('test-atomic-creation', 'tester')

      // Create a parent idea first
      const parentId = await useStore.getState().addIdea('Parent for atomic test', { x: 100, y: 100 })
      await this.waitForState(200)

      const afterParent = this.getStateSnapshot()

      // Use atomic operation (addIdeaWithEdge)
      const result = await useStore.getState().addIdeaWithEdge(
        'Child from atomic operation', 
        { x: 200, y: 200 }, 
        parentId, 
        'relates-to', 
        'Atomic test'
      )
      await this.waitForState(200)

      const afterAtomic = this.getStateSnapshot()

      // Verify both idea and edge were created
      if (afterAtomic.ideasCount !== afterParent.ideasCount + 1) {
        throw new Error(`Expected ${afterParent.ideasCount + 1} ideas, got ${afterAtomic.ideasCount}`)
      }

      if (afterAtomic.edgesCount !== afterParent.edgesCount + 1) {
        throw new Error(`Expected ${afterParent.edgesCount + 1} edges, got ${afterAtomic.edgesCount}`)
      }

      if (!afterAtomic.ideas[result.ideaId]) {
        throw new Error('Created idea not found in state')
      }

      if (!result.edgeId || !afterAtomic.edges[result.edgeId]) {
        throw new Error('Created edge not found in state')
      }

      // Test undo - should remove BOTH idea and edge in one operation
      const undoState = (useStore.getState() as any).undoRedoManager?.undo()
      if (!undoState) {
        throw new Error('Undo returned null - no history available')
      }

      // Apply undo state
      useStore.setState({ ideas: undoState.ideas, edges: undoState.edges })
      await this.waitForState(100)

      const afterUndo = this.getStateSnapshot()

      // Verify both were removed
      if (afterUndo.ideasCount !== afterParent.ideasCount) {
        throw new Error(`Expected ${afterParent.ideasCount} ideas after undo, got ${afterUndo.ideasCount}`)
      }

      if (afterUndo.edgesCount !== afterParent.edgesCount) {
        throw new Error(`Expected ${afterParent.edgesCount} edges after undo, got ${afterUndo.edgesCount}`)
      }

      if (afterUndo.ideas[result.ideaId]) {
        throw new Error('Idea still exists after undo')
      }

      if (afterUndo.edges[result.edgeId!]) {
        throw new Error('Edge still exists after undo')
      }

      undoDebugger.endOperation(true, { parentId, result, afterAtomic, afterUndo })
      return true
    })
  }

  // Test 4: Position updates with debounced saving
  async testPositionUpdates() {
    return this.addTestResult('Position Updates and Undo', async () => {
      const initialState = this.getStateSnapshot()
      undoDebugger.startOperation('test-position-update', 'tester')

      // Create an idea
      const ideaId = await useStore.getState().addIdea('Position test idea', { x: 100, y: 100 })
      await this.waitForState(200)

      const originalPosition = useStore.getState().ideas[ideaId]?.position_x

      // Update position
      useStore.getState().updateIdeaPosition(ideaId, { x: 300, y: 300 })
      await this.waitForState(200)

      const afterMove = this.getStateSnapshot()
      const newPosition = afterMove.ideas[ideaId]?.position_x

      // Verify position was updated
      if (newPosition === originalPosition) {
        throw new Error('Position was not updated')
      }

      if (newPosition !== 300) {
        throw new Error(`Expected position 300, got ${newPosition}`)
      }

      // Test undo
      const undoState = (useStore.getState() as any).undoRedoManager?.undo()
      if (!undoState) {
        throw new Error('Undo returned null - no history available')
      }

      // Apply undo state
      useStore.setState({ ideas: undoState.ideas, edges: undoState.edges })
      await this.waitForState(100)

      const afterUndo = this.getStateSnapshot()
      const undoPosition = afterUndo.ideas[ideaId]?.position_x

      // Verify position was restored
      if (undoPosition !== originalPosition) {
        throw new Error(`Expected original position ${originalPosition}, got ${undoPosition}`)
      }

      undoDebugger.endOperation(true, { ideaId, originalPosition, newPosition, undoPosition })
      return true
    })
  }

  // Test 5: Text updates with AI processing
  async testTextUpdates() {
    return this.addTestResult('Text Updates and Undo', async () => {
      const initialState = this.getStateSnapshot()
      undoDebugger.startOperation('test-text-update', 'tester')

      // Create an idea
      const ideaId = await useStore.getState().addIdea('Original text', { x: 100, y: 100 })
      await this.waitForState(200)

      const originalText = useStore.getState().ideas[ideaId]?.text

      // Update text (skip AI for faster testing)
      await useStore.getState().updateIdeaText(ideaId, 'Updated text for testing', { skipAI: true })
      await this.waitForState(200)

      const afterUpdate = this.getStateSnapshot()
      const newText = afterUpdate.ideas[ideaId]?.text

      // Verify text was updated
      if (newText === originalText) {
        throw new Error('Text was not updated')
      }

      if (newText !== 'Updated text for testing') {
        throw new Error(`Expected 'Updated text for testing', got '${newText}'`)
      }

      // Test undo
      const undoState = (useStore.getState() as any).undoRedoManager?.undo()
      if (!undoState) {
        throw new Error('Undo returned null - no history available')
      }

      // Apply undo state
      useStore.setState({ ideas: undoState.ideas, edges: undoState.edges })
      await this.waitForState(100)

      const afterUndo = this.getStateSnapshot()
      const undoText = afterUndo.ideas[ideaId]?.text

      // Verify text was restored
      if (undoText !== originalText) {
        throw new Error(`Expected original text '${originalText}', got '${undoText}'`)
      }

      undoDebugger.endOperation(true, { ideaId, originalText, newText, undoText })
      return true
    })
  }

  // Test 6: Delete operations with CASCADE handling
  async testDeleteOperations() {
    return this.addTestResult('Delete Operations and Undo', async () => {
      const initialState = this.getStateSnapshot()
      undoDebugger.startOperation('test-delete-operations', 'tester')

      // Create a parent with multiple children and edges
      const parentId = await useStore.getState().addIdea('Parent to delete', { x: 100, y: 100 })
      const child1Id = await useStore.getState().addIdea('Child 1', { x: 200, y: 200 })
      const child2Id = await useStore.getState().addIdea('Child 2', { x: 300, y: 300 })
      await this.waitForState(200)

      const edge1Id = await useStore.getState().addEdge(parentId, child1Id, 'relates-to')
      const edge2Id = await useStore.getState().addEdge(parentId, child2Id, 'relates-to')
      await this.waitForState(200)

      const beforeDelete = this.getStateSnapshot()

      // Delete the parent idea (should cascade delete edges)
      await useStore.getState().deleteIdea(parentId)
      await this.waitForState(200)

      const afterDelete = this.getStateSnapshot()

      // Verify parent was deleted
      if (afterDelete.ideas[parentId]) {
        throw new Error('Parent idea still exists after delete')
      }

      // Verify children still exist (only edges should be cascade deleted)
      if (!afterDelete.ideas[child1Id] || !afterDelete.ideas[child2Id]) {
        throw new Error('Child ideas were incorrectly deleted')
      }

      // Verify edges were cascade deleted
      if (afterDelete.edges[edge1Id] || afterDelete.edges[edge2Id]) {
        throw new Error('Edges were not cascade deleted')
      }

      // Test undo
      const undoState = (useStore.getState() as any).undoRedoManager?.undo()
      if (!undoState) {
        throw new Error('Undo returned null - no history available')
      }

      // Apply undo state
      useStore.setState({ ideas: undoState.ideas, edges: undoState.edges })
      await this.waitForState(100)

      const afterUndo = this.getStateSnapshot()

      // Verify everything was restored
      if (!afterUndo.ideas[parentId]) {
        throw new Error('Parent idea was not restored')
      }

      if (!afterUndo.ideas[child1Id] || !afterUndo.ideas[child2Id]) {
        throw new Error('Child ideas were not preserved')
      }

      if (!afterUndo.edges[edge1Id] || !afterUndo.edges[edge2Id]) {
        throw new Error('Edges were not restored')
      }

      undoDebugger.endOperation(true, { parentId, child1Id, child2Id, edge1Id, edge2Id, beforeDelete, afterDelete, afterUndo })
      return true
    })
  }

  // Test 7: Redo functionality
  async testRedoFunctionality() {
    return this.addTestResult('Redo Functionality', async () => {
      const initialState = this.getStateSnapshot()
      undoDebugger.startOperation('test-redo', 'tester')

      // Create an idea
      const ideaId = await useStore.getState().addIdea('Redo test idea', { x: 100, y: 100 })
      await this.waitForState(200)

      const afterCreate = this.getStateSnapshot()

      // Undo the creation
      const undoState = (useStore.getState() as any).undoRedoManager?.undo()
      if (!undoState) {
        throw new Error('Undo returned null - no history available')
      }

      useStore.setState({ ideas: undoState.ideas, edges: undoState.edges })
      await this.waitForState(100)

      const afterUndo = this.getStateSnapshot()

      // Verify idea was removed
      if (afterUndo.ideas[ideaId]) {
        throw new Error('Idea still exists after undo')
      }

      // Test redo
      const redoState = (useStore.getState() as any).undoRedoManager?.redo()
      if (!redoState) {
        throw new Error('Redo returned null - no future history available')
      }

      useStore.setState({ ideas: redoState.ideas, edges: redoState.edges })
      await this.waitForState(100)

      const afterRedo = this.getStateSnapshot()

      // Verify idea was restored
      if (!afterRedo.ideas[ideaId]) {
        throw new Error('Idea was not restored by redo')
      }

      if (afterRedo.ideasCount !== afterCreate.ideasCount) {
        throw new Error(`Expected ${afterCreate.ideasCount} ideas after redo, got ${afterRedo.ideasCount}`)
      }

      undoDebugger.endOperation(true, { ideaId, afterCreate, afterUndo, afterRedo })
      return true
    })
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Starting comprehensive undo/redo tests...')
    this.results = []
    
    undoDebugger.clearLogs()
    undoDebugger.startOperation('full-test-suite', 'tester')

    // Clear any existing history before testing
    ;(useStore.getState() as any).undoRedoManager?.clear()

    try {
      await this.testBasicIdeaCreation()
      await this.testBasicEdgeCreation()
      await this.testAtomicIdeaEdgeCreation()
      await this.testPositionUpdates()
      await this.testTextUpdates()
      await this.testDeleteOperations()
      await this.testRedoFunctionality()

      const passed = this.results.filter(r => r.passed).length
      const total = this.results.length

      undoDebugger.endOperation(true, { passed, total, results: this.results })
      
      console.log('\n📊 Test Results Summary:')
      console.log(`✅ Passed: ${passed}/${total}`)
      console.log(`❌ Failed: ${total - passed}/${total}`)
      
      if (total - passed > 0) {
        console.log('\n❌ Failed tests:')
        this.results.filter(r => !r.passed).forEach(result => {
          console.log(`  • ${result.testName}: ${result.error}`)
        })
      }

      return { passed, total, results: this.results, success: passed === total }
    } catch (error) {
      undoDebugger.endOperation(false, { error })
      throw error
    }
  }

  getResults() {
    return this.results
  }
}

// Export singleton instance
export const undoRedoTester = new UndoRedoTester()

// Make available globally for manual testing
if (typeof window !== 'undefined') {
  (window as any).runUndoRedoTests = () => undoRedoTester.runAllTests()
  (window as any).getUndoRedoTestResults = () => undoRedoTester.getResults()
}