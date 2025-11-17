/**
 * Test suite for atomic idea and edge creation operations
 * This file validates the robust atomic functionality for undo/redo
 */

import { useStore } from '@/store/index'

interface TestResult {
  success: boolean
  message: string
  details?: any
}

/**
 * Test atomic idea creation without edge
 */
export const testAtomicIdeaOnly = async (): Promise<TestResult> => {
  try {
    const store = useStore.getState()
    
    if (!store.currentBrainDumpId) {
      return { success: false, message: 'No brain dump selected for testing' }
    }

    const initialIdeasCount = Object.keys(store.ideas).length
    const initialEdgesCount = Object.keys(store.edges).length
    
    const result = await store.addIdeaWithEdge(
      'Test atomic idea creation',
      { x: 100, y: 100 }
    )
    
    const finalState = useStore.getState()
    const finalIdeasCount = Object.keys(finalState.ideas).length
    const finalEdgesCount = Object.keys(finalState.edges).length
    
    const success = 
      finalIdeasCount === initialIdeasCount + 1 &&
      finalEdgesCount === initialEdgesCount &&
      result.ideaId &&
      !result.edgeId &&
      finalState.ideas[result.ideaId]?.text === 'Test atomic idea creation'
    
    return {
      success,
      message: success ? 'Atomic idea creation succeeded' : 'Atomic idea creation failed',
      details: {
        ideaId: result.ideaId,
        edgeId: result.edgeId,
        ideasDelta: finalIdeasCount - initialIdeasCount,
        edgesDelta: finalEdgesCount - initialEdgesCount
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Atomic idea creation threw error: ${error}`,
      details: { error }
    }
  }
}

/**
 * Test atomic idea creation with edge
 */
export const testAtomicIdeaWithEdge = async (): Promise<TestResult> => {
  try {
    const store = useStore.getState()
    
    if (!store.currentBrainDumpId) {
      return { success: false, message: 'No brain dump selected for testing' }
    }

    // First create a parent idea
    const parentId = await store.addIdea('Parent idea for test', { x: 50, y: 50 })
    
    const initialState = useStore.getState()
    const initialIdeasCount = Object.keys(initialState.ideas).length
    const initialEdgesCount = Object.keys(initialState.edges).length
    
    const result = await store.addIdeaWithEdge(
      'Child idea with edge',
      { x: 150, y: 150 },
      parentId,
      'relates-to',
      'Test edge note'
    )
    
    const finalState = useStore.getState()
    const finalIdeasCount = Object.keys(finalState.ideas).length
    const finalEdgesCount = Object.keys(finalState.edges).length
    
    const createdEdge = result.edgeId ? finalState.edges[result.edgeId] : null
    
    const success = 
      finalIdeasCount === initialIdeasCount + 1 &&
      finalEdgesCount === initialEdgesCount + 1 &&
      result.ideaId &&
      result.edgeId &&
      finalState.ideas[result.ideaId]?.text === 'Child idea with edge' &&
      createdEdge?.parent_id === parentId &&
      createdEdge?.child_id === result.ideaId &&
      createdEdge?.type === 'relates-to' &&
      createdEdge?.note === 'Test edge note'
    
    return {
      success,
      message: success ? 'Atomic idea with edge creation succeeded' : 'Atomic idea with edge creation failed',
      details: {
        parentId,
        childId: result.ideaId,
        edgeId: result.edgeId,
        ideasDelta: finalIdeasCount - initialIdeasCount,
        edgesDelta: finalEdgesCount - initialEdgesCount,
        edge: createdEdge
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Atomic idea with edge creation threw error: ${error}`,
      details: { error }
    }
  }
}

/**
 * Test circular dependency prevention
 */
export const testCircularDependencyPrevention = async (): Promise<TestResult> => {
  try {
    const store = useStore.getState()
    
    if (!store.currentBrainDumpId) {
      return { success: false, message: 'No brain dump selected for testing' }
    }

    // Create a chain: A -> B -> C
    const ideaA = await store.addIdea('Idea A', { x: 100, y: 100 })
    const resultB = await store.addIdeaWithEdge('Idea B', { x: 200, y: 100 }, ideaA)
    const resultC = await store.addIdeaWithEdge('Idea C', { x: 300, y: 100 }, resultB.ideaId)
    
    // Now try to create C -> A (would create cycle)
    try {
      await store.addEdge(resultC.ideaId, ideaA, 'relates-to')
      return {
        success: false,
        message: 'Circular dependency was not prevented',
        details: { ideaA, ideaB: resultB.ideaId, ideaC: resultC.ideaId }
      }
    } catch (cycleError) {
      // This should happen - circular dependency should be prevented
      return {
        success: true,
        message: 'Circular dependency correctly prevented',
        details: { 
          ideaA, 
          ideaB: resultB.ideaId, 
          ideaC: resultC.ideaId, 
          cycleError: cycleError.toString() 
        }
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Circular dependency test threw unexpected error: ${error}`,
      details: { error }
    }
  }
}

/**
 * Test edge case: invalid parent ID
 */
export const testInvalidParentId = async (): Promise<TestResult> => {
  try {
    const store = useStore.getState()
    
    if (!store.currentBrainDumpId) {
      return { success: false, message: 'No brain dump selected for testing' }
    }

    const initialIdeasCount = Object.keys(store.ideas).length
    const initialEdgesCount = Object.keys(store.edges).length
    
    try {
      await store.addIdeaWithEdge(
        'Should fail with invalid parent',
        { x: 100, y: 100 },
        'non-existent-parent-id'
      )
      
      return {
        success: false,
        message: 'Invalid parent ID was not caught',
        details: { invalidParentId: 'non-existent-parent-id' }
      }
    } catch (validationError) {
      // This should happen - invalid parent should be caught
      const finalState = useStore.getState()
      const finalIdeasCount = Object.keys(finalState.ideas).length
      const finalEdgesCount = Object.keys(finalState.edges).length
      
      const success = 
        finalIdeasCount === initialIdeasCount &&
        finalEdgesCount === initialEdgesCount
      
      return {
        success,
        message: success 
          ? 'Invalid parent ID correctly prevented and no orphaned data created'
          : 'Invalid parent ID prevented but may have left orphaned data',
        details: {
          validationError: validationError.toString(),
          ideasDelta: finalIdeasCount - initialIdeasCount,
          edgesDelta: finalEdgesCount - initialEdgesCount
        }
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Invalid parent ID test threw unexpected error: ${error}`,
      details: { error }
    }
  }
}

/**
 * Run all atomic operation tests
 */
export const runAtomicOperationTests = async (): Promise<{ results: TestResult[], summary: { passed: number, failed: number } }> => {
  const tests = [
    { name: 'Atomic Idea Only', test: testAtomicIdeaOnly },
    { name: 'Atomic Idea With Edge', test: testAtomicIdeaWithEdge },
    { name: 'Circular Dependency Prevention', test: testCircularDependencyPrevention },
    { name: 'Invalid Parent ID', test: testInvalidParentId }
  ]
  
  const results: TestResult[] = []
  let passed = 0
  let failed = 0
  
  console.log('🧪 Running atomic operation tests...')
  
  for (const { name, test } of tests) {
    console.log(`Running: ${name}`)
    const result = await test()
    results.push({ ...result, message: `${name}: ${result.message}` })
    
    if (result.success) {
      passed++
      console.log(`✅ ${name}: PASSED`)
    } else {
      failed++
      console.log(`❌ ${name}: FAILED - ${result.message}`)
      if (result.details) {
        console.log('Details:', result.details)
      }
    }
  }
  
  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed`)
  
  return { results, summary: { passed, failed } }
}

// Console helper for quick testing
export const quickTest = async () => {
  console.log('🧪 Quick Test: Testing atomic operations...')
  
  try {
    const store = useStore.getState()
    
    if (!store.currentBrainDumpId) {
      console.log('❌ No brain dump selected. Please create/select a brain dump first.')
      return
    }
    
    console.log('✅ Brain dump selected:', store.currentBrainDumpId)
    
    // Test 1: Simple idea creation
    console.log('\n1️⃣ Testing atomic idea creation...')
    const result1 = await store.addIdeaWithEdge('Test atomic idea', { x: 100, y: 100 })
    console.log('✅ Created idea:', result1.ideaId)
    
    // Test 2: Idea with edge
    console.log('\n2️⃣ Testing atomic idea with edge creation...')
    const result2 = await store.addIdeaWithEdge('Connected idea', { x: 200, y: 100 }, result1.ideaId)
    console.log('✅ Created idea:', result2.ideaId, 'with edge:', result2.edgeId)
    
    // Test 3: Undo
    console.log('\n3️⃣ Testing undo functionality...')
    const canUndoBefore = store.canUndo()
    console.log('Can undo before:', canUndoBefore)
    
    if (canUndoBefore) {
      await store.undo()
      console.log('✅ Undo executed')
      
      const state = useStore.getState()
      const ideaExists = !!state.ideas[result2.ideaId]
      const edgeExists = result2.edgeId ? !!state.edges[result2.edgeId] : false
      console.log('Idea exists after undo:', ideaExists)
      console.log('Edge exists after undo:', edgeExists)
      
      if (!ideaExists && !edgeExists) {
        console.log('✅ Atomic undo working correctly!')
      }
    }
    
    console.log('\n🎉 Quick test completed successfully!')
    
  } catch (error) {
    console.error('❌ Quick test failed:', error)
  }
}

// Global access for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testAtomicOperations = {
    runAll: runAtomicOperationTests,
    quickTest,
    testAtomicIdeaOnly,
    testAtomicIdeaWithEdge,
    testCircularDependencyPrevention,
    testInvalidParentId
  }
}