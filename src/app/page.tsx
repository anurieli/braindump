'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useStore } from '@/store'
import CanvasHeader from '@/components/CanvasHeader'
import { QuickInput } from '@/components/QuickInput'

// Dynamically import Canvas to avoid SSR issues with Konva
const Canvas = dynamic(() => import('@/components/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading Canvas...</p>
      </div>
    </div>
  )
})

export default function Home() {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Store selectors
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId)
  const loadBrainDumps = useStore(state => state.loadBrainDumps)
  const createBrainDump = useStore(state => state.createBrainDump)
  const loadIdeas = useStore(state => state.loadIdeas)

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Initialize app with brain dump
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load existing brain dumps (this will auto-select the first one if available)
        await loadBrainDumps()
        
        // Wait a moment for state to update
        setTimeout(async () => {
          const currentId = useStore.getState().currentBrainDumpId
          
          // Only create a new brain dump if none exist at all
          if (!currentId) {
            await createBrainDump('Test Brain Dump')
          }
          
          setIsInitialized(true)
        }, 100)
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setIsInitialized(true) // Show canvas anyway
      }
    }
    
    initializeApp()
  }, []) // Remove dependencies to run only once on mount

  // Load ideas when brain dump changes
  useEffect(() => {
    if (currentBrainDumpId) {
      loadIdeas(currentBrainDumpId)
    }
  }, [currentBrainDumpId, loadIdeas])

  // Show loading until initialized
  if (!isInitialized) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing Brain Dump...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-white dark:bg-gray-900 relative">
      <Canvas width={dimensions.width} height={dimensions.height} />
      
      {/* Canvas Header with brain dump name and idea count */}
      <CanvasHeader />
      
      {/* Quick Input for creating ideas */}
      <QuickInput />
    </div>
  )
}
