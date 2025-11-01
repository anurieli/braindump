'use client'

import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import Konva from 'konva'
import { useStore } from '@/store'
import { debounce } from '@/lib/debounce'
import Grid from './Grid'
import Idea from './Idea'

interface CanvasProps {
  width?: number
  height?: number
}

export default function Canvas({ width = 1920, height = 1080 }: CanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  
  // Store selectors
  const viewport = useStore(state => state.viewport)
  const updateViewport = useStore(state => state.updateViewport)
  const saveViewport = useStore(state => state.saveViewport)
  const isPanning = useStore(state => state.isPanning)
  const setPanning = useStore(state => state.setPanning)
  const isGridVisible = useStore(state => state.isGridVisible)
  const enableAnimations = useStore(state => state.enableAnimations)
  // Get ideas from store 
  const ideas = useStore(state => state.ideas)
  const allIdeas = useMemo(() => Object.values(ideas), [ideas])
  
  // Selection-related store actions
  const addToSelection = useStore(state => state.addToSelection)
  const clearSelection = useStore(state => state.clearSelection)
  
  // Local state for selection rectangle
  const [selectionBox, setSelectionBox] = useState<{
    x: number
    y: number
    width: number
    height: number
    visible: boolean
  } | null>(null)
  
  // Calculate visible ideas with useMemo to prevent infinite loops
  const visibleIdeas = useMemo(() => {
    const buffer = 500 // Render ideas 500px outside viewport for smooth scrolling
    const { x, y, zoom } = viewport
    
    // Convert screen viewport to world coordinates
    // In Konva, negative stage position means we've moved right/down in world space
    const worldLeft = (-x - buffer) / zoom
    const worldTop = (-y - buffer) / zoom
    const worldRight = (-x + width + buffer) / zoom
    const worldBottom = (-y + height + buffer) / zoom

    return allIdeas.filter(idea => {
      const ideaRight = idea.position_x + (idea.width || 200)
      const ideaBottom = idea.position_y + (idea.height || 100)

      const isVisible = !(
        idea.position_x > worldRight ||
        ideaRight < worldLeft ||
        idea.position_y > worldBottom ||
        ideaBottom < worldTop
      )

      return isVisible
    })
  }, [allIdeas, viewport, width, height])

  // Debounced viewport save function
  const debouncedSaveViewport = useCallback(() => {
    const debouncedFn = debounce(saveViewport, 5000)
    debouncedFn()
  }, [saveViewport])

  // Initialize stage position and scale from store
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    // Only update if there's a meaningful difference
    const currentPos = stage.position()
    const currentScale = stage.scaleX()
    
    const positionChanged = Math.abs(currentPos.x - viewport.x) > 0.1 || Math.abs(currentPos.y - viewport.y) > 0.1
    const scaleChanged = Math.abs(currentScale - viewport.zoom) > 0.001
    
    if (positionChanged) {
      stage.position({ x: viewport.x, y: viewport.y })
    }
    if (scaleChanged) {
      stage.scale({ x: viewport.zoom, y: viewport.zoom })
    }
  }, [viewport])

  // Handle click on empty space to clear selections
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Only handle clicks on empty space (not on ideas or other elements)
    if (e.target !== e.target.getStage()) return
    
    // Clear selections when clicking on empty space (if not dragging)
    if (!selectionBox) {
      clearSelection()
    }
  }, [clearSelection, selectionBox])

  // Handle pan functionality (Cmd + drag) and selection rectangle
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey
    const stage = e.target.getStage()
    if (!stage) return
    
    // Handle panning (Cmd/Ctrl + drag)
    if (isCtrlPressed) {
      e.evt.preventDefault()
      setPanning(true)
      stage.container().style.cursor = 'grabbing'
      stage.startDrag()
      return
    }
    
    // Handle selection rectangle (drag on empty stage)
    if (e.target === stage) {
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      
      // Convert screen coordinates to world coordinates
      const { x: stageX, y: stageY } = stage.position()
      const zoom = stage.scaleX()
      const worldX = (pointer.x - stageX) / zoom
      const worldY = (pointer.y - stageY) / zoom
      
      setSelectionBox({
        x: worldX,
        y: worldY,
        width: 0,
        height: 0,
        visible: true
      })
    }
  }, [setPanning])

  // Handle mouse move for selection rectangle
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!selectionBox || !selectionBox.visible) return
    
    const stage = e.target.getStage()
    if (!stage) return
    
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    
    // Convert screen coordinates to world coordinates
    const { x: stageX, y: stageY } = stage.position()
    const zoom = stage.scaleX()
    const worldX = (pointer.x - stageX) / zoom
    const worldY = (pointer.y - stageY) / zoom
    
    // Update selection box dimensions
    setSelectionBox({
      ...selectionBox,
      width: worldX - selectionBox.x,
      height: worldY - selectionBox.y,
      visible: true
    })
  }, [selectionBox])

  const handleMouseUp = useCallback(() => {
    // Handle panning end
    if (isPanning) {
      setPanning(false)
      const stage = stageRef.current
      if (stage) {
        stage.container().style.cursor = 'default'
        
        // Update viewport in store
        const pos = stage.position()
        const scale = stage.scale()
        updateViewport({
          x: pos.x,
          y: pos.y,
          zoom: scale?.x || 1
        })

        // Trigger debounced save
        debouncedSaveViewport()
      }
      return
    }
    
    // Handle selection rectangle end
    if (selectionBox && selectionBox.visible) {
      const stage = stageRef.current
      if (!stage) return
      
      // Calculate the normalized selection box (handle negative width/height)
      const box = {
        x: selectionBox.width >= 0 ? selectionBox.x : selectionBox.x + selectionBox.width,
        y: selectionBox.height >= 0 ? selectionBox.y : selectionBox.y + selectionBox.height,
        width: Math.abs(selectionBox.width),
        height: Math.abs(selectionBox.height)
      }
      
      // Find ideas that intersect with the selection box
      const selectedIds: string[] = []
      allIdeas.forEach(idea => {
        const ideaBox = {
          x: idea.position_x,
          y: idea.position_y,
          width: idea.width || 200,
          height: idea.height || 100
        }
        
        // Check if boxes intersect using Konva utility
        if (Konva.Util.haveIntersection(box, ideaBox)) {
          selectedIds.push(idea.id)
        }
      })
      
      // Update selection in store
      if (selectedIds.length > 0) {
        addToSelection(selectedIds)
      }
      
      // Clear selection box
      setSelectionBox(null)
    }
  }, [isPanning, setPanning, updateViewport, debouncedSaveViewport, selectionBox, allIdeas, addToSelection])

  const handleDragEnd = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    const pos = stage.position()
    const scale = stage.scale()
    
    updateViewport({
      x: pos.x,
      y: pos.y,
      zoom: scale?.x || 1
    })

    debouncedSaveViewport()
  }, [updateViewport, debouncedSaveViewport])

  // Handle zoom functionality (Cmd/Ctrl + scroll)
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    
    const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey
    if (!isCtrlPressed) return

    const stage = stageRef.current
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // Calculate zoom factor
    const scaleBy = 1.05
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.max(0.1, Math.min(5, oldScale * Math.pow(scaleBy, direction)))

    // Calculate new position to zoom towards mouse pointer
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    }

    // Apply animation if enabled
    if (enableAnimations) {
      const tween = new Konva.Tween({
        node: stage,
        duration: 0.1,
        scaleX: newScale,
        scaleY: newScale,
        x: newPos.x,
        y: newPos.y,
        easing: Konva.Easings.EaseOut,
        onFinish: () => {
          updateViewport({
            x: newPos.x,
            y: newPos.y,
            zoom: newScale
          })
          debouncedSaveViewport()
        }
      })
      tween.play()
    } else {
      stage.scale({ x: newScale, y: newScale })
      stage.position(newPos)
      updateViewport({
        x: newPos.x,
        y: newPos.y,
        zoom: newScale
      })
      debouncedSaveViewport()
    }
  }, [updateViewport, debouncedSaveViewport, enableAnimations])

  // Get additional store actions for keyboard shortcuts
  const toggleTheme = useStore(state => state.toggleTheme)
  const toggleGrid = useStore(state => state.toggleGrid)
  const toggleSidebar = useStore(state => state.toggleSidebar)
  const createBrainDump = useStore(state => state.createBrainDump)
  const getCurrentBrainDump = useStore(state => state.getCurrentBrainDump)
  const deleteIdea = useStore(state => state.deleteIdea)

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Delete or Backspace to delete selected ideas
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdeaIds.size > 0) {
        e.preventDefault()
        const selectedCount = selectedIdeaIds.size
        const confirmed = window.confirm(
          `Are you sure you want to delete ${selectedCount} idea${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`
        )
        
        if (confirmed) {
          const deletePromises = Array.from(selectedIdeaIds).map(id => deleteIdea(id))
          Promise.all(deletePromises)
            .then(() => {
              clearSelection()
              console.log(`🗑️ Deleted ${selectedCount} idea(s) via keyboard shortcut`)
            })
            .catch(error => {
              console.error('Failed to delete ideas:', error)
              alert('Failed to delete some ideas. Please try again.')
            })
        }
        return
      }

      // Ctrl+Shift+T or Cmd+Shift+T to toggle theme
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        toggleTheme()
        console.log('🎨 Theme toggled via keyboard shortcut')
        return
      }

      // Ctrl+G or Cmd+G to toggle grid
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        toggleGrid()
        console.log('📊 Grid toggled via keyboard shortcut')
        return
      }

      // Ctrl+/ or Cmd+/ to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        toggleSidebar()
        console.log('🗂️ Sidebar toggled via keyboard shortcut')
        return
      }

      // Ctrl+N or Cmd+N to create new brain dump
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        const newName = `Brain Dump ${new Date().toLocaleDateString()}`
        createBrainDump(newName)
        console.log('🧠 New brain dump created via keyboard shortcut')
        return
      }

      // Ctrl+D or Cmd+D to duplicate current brain dump
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        const currentBrainDump = getCurrentBrainDump()
        if (currentBrainDump) {
          const duplicateName = `${currentBrainDump.name} (Copy)`
          createBrainDump(duplicateName)
          console.log('📋 Brain dump duplicated via keyboard shortcut')
        }
        return
      }

      // Ctrl+0 or Cmd+0 to reset view
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        
        const stage = stageRef.current
        if (!stage) return

        const resetPos = { x: 0, y: 0 }
        const resetScale = 1

        if (enableAnimations) {
          const tween = new Konva.Tween({
            node: stage,
            duration: 0.3,
            scaleX: resetScale,
            scaleY: resetScale,
            x: resetPos.x,
            y: resetPos.y,
            easing: Konva.Easings.EaseInOut,
            onFinish: () => {
              updateViewport({
                x: resetPos.x,
                y: resetPos.y,
                zoom: resetScale
              })
              debouncedSaveViewport()
            }
          })
          tween.play()
        } else {
          stage.scale({ x: resetScale, y: resetScale })
          stage.position(resetPos)
          updateViewport({
            x: resetPos.x,
            y: resetPos.y,
            zoom: resetScale
          })
          debouncedSaveViewport()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [updateViewport, debouncedSaveViewport, enableAnimations, toggleTheme, toggleGrid, toggleSidebar, createBrainDump, getCurrentBrainDump, selectedIdeaIds, deleteIdea, clearSelection])

  // Update cursor based on panning state
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const container = stage.container()
    container.style.cursor = isPanning ? 'grabbing' : 'default'
  }, [isPanning])

  // Force layer redraw when ideas change
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    // Force redraw of the main content layer specifically
    const layers = stage.getLayers()
    if (layers.length > 1) {
      layers[1].batchDraw() // Main content layer (index 1)
    }
  }, [visibleIdeas.length])

  return (
    <div className="canvas-container w-full h-full overflow-hidden">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        draggable={true}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
        onDragEnd={handleDragEnd}
        onWheel={handleWheel}
        className="bg-white dark:bg-gray-900"
      >
        <Layer>
          <Grid 
            viewport={viewport}
            stageWidth={width}
            stageHeight={height}
            visible={isGridVisible}
          />
        </Layer>
        <Layer>
          {/* Main content layer - ideas will be rendered here */}
          {/* Viewport culling: Only rendering {visibleIdeas.length} visible ideas */}
          {visibleIdeas.map((idea) => {
            return (
              <Idea 
                key={idea.id} 
                idea={idea} 
              />
            )
          })}
        </Layer>
        <Layer>
          {/* Selection rectangle */}
          {selectionBox && selectionBox.visible && (
            <Rect
              x={selectionBox.width >= 0 ? selectionBox.x : selectionBox.x + selectionBox.width}
              y={selectionBox.height >= 0 ? selectionBox.y : selectionBox.y + selectionBox.height}
              width={Math.abs(selectionBox.width)}
              height={Math.abs(selectionBox.height)}
              stroke="#007AFF"
              strokeWidth={1}
              dash={[4, 4]}
              fill="rgba(0, 122, 255, 0.1)"
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}