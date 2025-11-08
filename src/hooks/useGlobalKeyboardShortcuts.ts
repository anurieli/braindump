'use client'

import { useHotkeys } from 'react-hotkeys-hook'
import { useStore } from '@/store'

export function useGlobalKeyboardShortcuts() {
  const createBrainDump = useStore(state => state.createBrainDump)
  const duplicateBrainDump = useStore(state => state.duplicateBrainDump)
  const toggleSidebar = useStore(state => state.toggleSidebar)
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId)

  // Ctrl+N: Create new brain dump
  useHotkeys('ctrl+n', (event) => {
    event.preventDefault()
    createBrainDump('New Brain Dump')
  }, {
    enableOnFormTags: false, // Don't trigger when focused on input/textarea/select
    description: 'Create new brain dump'
  })

  // Ctrl+D: Duplicate current brain dump
  useHotkeys('ctrl+d', (event) => {
    event.preventDefault()
    if (currentBrainDumpId) {
      duplicateBrainDump(currentBrainDumpId)
    }
  }, {
    enableOnFormTags: false,
    description: 'Duplicate current brain dump'
  })

  // Ctrl+/: Toggle side panel
  useHotkeys('ctrl+/', (event) => {
    event.preventDefault()
    toggleSidebar()
  }, {
    enableOnFormTags: false,
    description: 'Toggle side panel'
  })
}