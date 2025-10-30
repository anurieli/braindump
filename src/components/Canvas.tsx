'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Stage, Layer } from 'react-konva'
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
  const getVisibleIdeas = useStore(state => state.getVisibleIdeas)
  const addIdea = useStore(state => state.addIdea)
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId)
  
  // Get only visible ideas for performance (viewport culling)
  const visibleIdeas = getVisibleIdeas(viewport, { width, height })

  // Debounced viewport save function
  const debouncedSaveViewport = useCallback(() => {
    const debouncedFn = debounce(saveViewport, 5000)
    debouncedFn()
  }, [saveViewport])

  // Initialize stage position and scale from store
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    stage.position({ x: viewport.x, y: viewport.y })
    stage.scale({ x: viewport.zoom, y: viewport.zoom })
  }, [viewport])

  // Handle click to create ideas (for testing drag functionality)
  const handleStageClick = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Don't create ideas if we're panning, ctrl is pressed, or clicking on an existing idea
    const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey
    if (isPanning || isCtrlPressed || e.target !== e.target.getStage()) return
    
    const stage = e.target.getStage()
    if (!stage || !currentBrainDumpId) return
    
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    
    // Convert screen coordinates to world coordinates
    const scale = stage.scaleX()
    const worldX = (pointer.x - stage.x()) / scale
    const worldY = (pointer.y - stage.y()) / scale
    
    console.log('🖱️ Creating idea:', {
      pointer: { x: pointer.x, y: pointer.y },
      stage: { x: stage.x(), y: stage.y(), scale },
      world: { x: worldX, y: worldY },
      viewport
    })
    
    try {
      await addIdea(`Test idea at (${Math.round(worldX)}, ${Math.round(worldY)})`, { x: worldX, y: worldY })
      console.log('✅ Idea created successfully')
    } catch (error) {
      console.error('❌ Failed to create test idea:', error)
    }
  }, [isPanning, currentBrainDumpId, addIdea])

  // Handle pan functionality (Ctrl + drag)
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey
    
    if (isCtrlPressed) {
      e.evt.preventDefault()
      setPanning(true)
      const stage = e.target.getStage()
      if (stage) {
        stage.container().style.cursor = 'grabbing'
        stage.startDrag()
      }
    }
  }, [setPanning])

  const handleMouseUp = useCallback(() => {
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
    }
  }, [isPanning, setPanning, updateViewport, debouncedSaveViewport])

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

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
  }, [updateViewport, debouncedSaveViewport, enableAnimations])

  // Update cursor based on panning state
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const container = stage.container()
    container.style.cursor = isPanning ? 'grabbing' : 'default'
  }, [isPanning])

  // Force layer redraw when ideas change
  useEffect(() => {
    console.log('🎨 Ideas changed, forcing redraw:', {
      visibleCount: visibleIdeas.length,
      visibleIdeas: visibleIdeas.map(i => ({ id: i.id, x: i.position_x, y: i.position_y })),
      viewport
    })
    
    const stage = stageRef.current
    if (!stage) return

    // Force redraw of the main content layer specifically
    const layers = stage.getLayers()
    if (layers.length > 1) {
      layers[1].batchDraw() // Main content layer (index 1)
      console.log('🎨 Layer redraw completed')
    }
  }, [visibleIdeas.length, visibleIdeas, viewport])

  return (
    <div className="canvas-container w-full h-full overflow-hidden">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        draggable={true}
        onMouseDown={handleMouseDown}
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
          {/* Main content layer - ideas and edges will be rendered here */}
          {/* Viewport culling: Only rendering {visibleIdeas.length} visible ideas */}
          {visibleIdeas.map((idea) => (
            <Idea key={idea.id} idea={idea} />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}