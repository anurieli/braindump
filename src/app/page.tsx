'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store'
import { getCurrentSession } from '@/lib/auth-helpers'
import Canvas from '@/components/Canvas'
import CanvasHeader from '@/components/CanvasHeader'
import EmptyState from '@/components/EmptyState'
import InputBox, { InputBoxHandle } from '@/components/InputBox'
import SidePanel from '@/components/SidePanel'
import SettingsModal from '@/components/SettingsModal'
import ShortcutsPanel from '@/components/ShortcutsPanel'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const inputBoxRef = useRef<InputBoxHandle>(null)
  
  const brainDumps = useStore(state => state.brainDumps)
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId)
  const isSidebarOpen = useStore(state => state.isSidebarOpen)
  const loadBrainDumps = useStore(state => state.loadBrainDumps)
  const loadIdeas = useStore(state => state.loadIdeas)
  const loadEdges = useStore(state => state.loadEdges)
  const loadEdgeTypes = useStore(state => state.loadEdgeTypes)
  const switchBrainDump = useStore(state => state.switchBrainDump)

  // Initialize global keyboard shortcuts
  useGlobalKeyboardShortcuts()
  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check authentication
        const { user, token } = await getCurrentSession()
        
        if (!user || !token) {
          router.push('/login')
          return
        }
        
        // Load brain dumps from database
        await loadBrainDumps()
        
        // Load edge types
        await loadEdgeTypes()

        setIsLoading(false)
        
        // Load user preferences after main app is ready (non-blocking)
        const { loadUserPreferences } = useStore.getState()
        loadUserPreferences(user.id).catch(error => {
          console.error('Failed to load user preferences:', error)
        })
      } catch (error) {
        console.error('Failed to initialize app:', error)
        router.push('/login')
      }
    }
    
    initializeApp()
  }, [router, loadBrainDumps, loadEdgeTypes])

  // Separate effect to handle brain dump selection after loading
  useEffect(() => {
    const handleBrainDumpSelection = async () => {
      if (isLoading) return // Don't run while still loading

      if (brainDumps.length === 0) {
        return
      }

      const hasCurrent = currentBrainDumpId
        ? brainDumps.some(brainDump => brainDump.id === currentBrainDumpId)
        : false

      if (!currentBrainDumpId || !hasCurrent) {
        await switchBrainDump(brainDumps[0].id)
      }
    }
    
    handleBrainDumpSelection()
  }, [brainDumps, currentBrainDumpId, isLoading, switchBrainDump])

  // Effect to load ideas and edges when brain dump changes
  useEffect(() => {
    const loadBrainDumpData = async () => {
      if (currentBrainDumpId && !isLoading) {
        await loadIdeas(currentBrainDumpId)
        await loadEdges(currentBrainDumpId)
      }
    }
    
    loadBrainDumpData()
  }, [currentBrainDumpId, isLoading, loadEdges, loadIdeas])

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your brain dumps...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen overflow-hidden flex">
      {/* Side Panel for Brain Dump Management */}
      <SidePanel />
      
      {/* Main Content Area */}
      <div className="flex-1 h-full relative overflow-hidden">
        {/* Main Canvas */}
        <ErrorBoundary>
          <Canvas inputBoxRef={inputBoxRef} />
        </ErrorBoundary>

        {/* Canvas Header */}
        <CanvasHeader />

        {brainDumps.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Input Box */}
            <InputBox ref={inputBoxRef} />

          </>
        )}

        {/* Modals */}
        <SettingsModal />
        
        {/* Shortcuts Panel - Always visible in top right */}
        <ShortcutsPanel />
      </div>
    </div>
  )
}
