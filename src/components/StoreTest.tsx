'use client'

import { useStore } from '@/store'
import { useState } from 'react'

export default function StoreTest() {
  const [testResults, setTestResults] = useState<string[]>([])
  
  // Get store state and actions
  const brainDumps = useStore(state => state.brainDumps)
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId)
  const ideas = useStore(state => state.ideas)
  const theme = useStore(state => state.theme)
  
  const createBrainDump = useStore(state => state.createBrainDump)
  const addIdea = useStore(state => state.addIdea)
  const toggleTheme = useStore(state => state.toggleTheme)
  const updateViewport = useStore(state => state.updateViewport)

  const runTests = async () => {
    const results: string[] = []
    
    try {
      // Test 1: Theme toggle
      const initialTheme = theme
      toggleTheme()
      const newTheme = useStore.getState().theme
      results.push(`✅ Theme toggle: ${initialTheme} → ${newTheme}`)
      
      // Test 2: Viewport update
      updateViewport({ x: 100, y: 200, zoom: 1.5 })
      const viewport = useStore.getState().viewport
      results.push(`✅ Viewport update: x=${viewport.x}, y=${viewport.y}, zoom=${viewport.zoom}`)
      
      // Test 3: Create brain dump (mock - won't actually hit DB without proper setup)
      try {
        const brainDumpId = await createBrainDump('Test Brain Dump')
        results.push(`✅ Brain dump creation attempted: ID ${brainDumpId}`)
      } catch (error) {
        results.push(`⚠️ Brain dump creation failed (expected without DB): ${error}`)
      }
      
      // Test 4: Add idea (mock)
      try {
        const ideaId = await addIdea('Test idea content', { x: 50, y: 75 })
        results.push(`✅ Idea creation attempted: ID ${ideaId}`)
      } catch (error) {
        results.push(`⚠️ Idea creation failed (expected without DB): ${error}`)
      }
      
      // Test 5: Store state access
      const storeState = useStore.getState()
      results.push(`✅ Store state accessible: ${Object.keys(storeState).length} properties`)
      
    } catch (error) {
      results.push(`❌ Test error: ${error}`)
    }
    
    setTestResults(results)
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        Zustand Store Test
      </h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Current State:
        </h3>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm font-mono">
          <div>Theme: {theme}</div>
          <div>Brain Dumps: {brainDumps.length}</div>
          <div>Current Brain Dump: {currentBrainDumpId || 'None'}</div>
          <div>Ideas: {Object.keys(ideas).length}</div>
        </div>
      </div>
      
      <button
        onClick={runTests}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        Run Store Tests
      </button>
      
      {testResults.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
            Test Results:
          </h3>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Quick Actions:
        </h3>
        <div className="flex gap-2">
          <button
            onClick={toggleTheme}
            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm"
          >
            Toggle Theme
          </button>
          <button
            onClick={() => updateViewport({ x: Math.random() * 100, y: Math.random() * 100, zoom: 1 })}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
          >
            Random Viewport
          </button>
        </div>
      </div>
    </div>
  )
}