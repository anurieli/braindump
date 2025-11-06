'use client'

import React, { useState, KeyboardEvent, useRef, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react'
import { Plus, X, Paperclip } from 'lucide-react'
import { useStore } from '@/store'
import type { ThemeType } from '@/types'
import { Button } from '@/components/ui/button'
import { findNonOverlappingPosition as findPosition } from '@/lib/idea-positioning'

// Theme utilities (copied from Dumpfigma)
interface Theme {
  name: string
  background: string
  isDark: boolean
  gridColor?: string
}

const themes: Record<ThemeType, Theme> = {
  light: {
    name: 'Clean White',
    background: '#ffffff',
    isDark: false,
    gridColor: '#e5e7eb',
  },
  'gradient-purple': {
    name: 'Purple Dreams',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    isDark: true,
  },
  'gradient-ocean': {
    name: 'Ocean Breeze',
    background: 'linear-gradient(135deg, #667eea 0%, #4facfe 50%, #00f2fe 100%)',
    isDark: true,
  },
  'gradient-sunset': {
    name: 'Sunset Vibes',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    isDark: true,
  },
  'gradient-forest': {
    name: 'Forest Mist',
    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    isDark: false,
  },
  'dots-light': {
    name: 'Dotted Light',
    background: '#f9fafb',
    isDark: false,
    gridColor: '#d1d5db',
  },
  'dots-dark': {
    name: 'Dotted Dark',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
    isDark: true,
  },
  waves: {
    name: 'Waves',
    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    isDark: false,
  },
}

const IDEA_WIDTH = 200
const IDEA_HEIGHT = 100

function getThemeTextColor(theme: ThemeType): {
  primary: string
  secondary: string
  tertiary: string
} {
  const isDark = themes[theme].isDark
  
  if (isDark) {
    return {
      primary: 'rgba(255, 255, 255, 1)',
      secondary: 'rgba(255, 255, 255, 0.6)',
      tertiary: 'rgba(255, 255, 255, 0.4)',
    }
  } else {
    return {
      primary: 'rgba(31, 41, 55, 1)', // gray-800
      secondary: 'rgba(75, 85, 99, 1)', // gray-600
      tertiary: 'rgba(156, 163, 175, 1)', // gray-400
    }
  }
}

function getThemeGlassStyle(theme: ThemeType, isActive: boolean = false) {
  const isDark = themes[theme].isDark
  
  if (isDark) {
    return {
      background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
      border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
      boxShadow: isActive
        ? '0 4px 16px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
        : '0 4px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.15) inset',
    }
  } else {
    return {
      background: isActive ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      border: `1px solid ${isActive ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.08)'}`,
      boxShadow: isActive
        ? '0 4px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
        : '0 4px 16px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.3) inset',
    }
  }
}

function getLiquidGlassStyle(theme: ThemeType, isActive: boolean = false) {
  return {
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(120px) saturate(200%)',
    WebkitBackdropFilter: 'blur(120px) saturate(200%)',
    border: 'none',
    boxShadow: isActive
      ? '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
      : '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
  }
}


type LocalAttachment = {
  id: string
  type: 'file' | 'url' | 'image'
  name: string
  url?: string
  thumbnail?: string
}

function normalizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  const candidate = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`

  try {
    const parsed = new URL(candidate)
    return parsed.href
  } catch {
    return null
  }
}

function extractUrlsFromText(text: string): string[] {
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
  const matches = text.match(urlPattern)
  return matches ? matches : []
}

// Interface for external control of InputBox
export interface InputBoxHandle {
  focusAndSetValue: (value: string) => void
}

const InputBox = forwardRef<InputBoxHandle>((props, ref) => {
  const [inputValue, setInputValue] = useState('')
  const [attachments, setAttachments] = useState<LocalAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  const addIdea = useStore(state => state.addIdea)
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId)
  const ideas = useStore(state => state.ideas)
  const theme = useStore(state => state.theme)
  const viewport = useStore(state => state.viewport)
  const isSidebarOpen = useStore(state => state.isSidebarOpen)
  const lastPlacedIdeaPosition = useStore(state => state.lastPlacedIdeaPosition)
  const updateViewport = useStore(state => state.updateViewport)
  
  const sidebarWidth = isSidebarOpen ? 320 : 0 // 320px is the width from SidePanel

  // Expose methods to parent component through ref
  useImperativeHandle(ref, () => ({
    focusAndSetValue: (value: string) => {
      setInputValue(value)
      inputRef.current?.focus()
    }
  }))

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = inputRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [inputValue])
  

  const handleSubmit = async () => {
    if (!inputValue.trim() || !currentBrainDumpId) {
      return
    }
    
    try {
      // Calculate viewport center, accounting for sidebar
      const viewportCenterX = (sidebarWidth + (window.innerWidth - sidebarWidth) / 2 - viewport.x) / viewport.zoom
      const viewportCenterY = (window.innerHeight / 2 - viewport.y) / viewport.zoom
      
      // Find a non-overlapping position using smart placement
      const { x, y } = findPosition(ideas, viewportCenterX, viewportCenterY, lastPlacedIdeaPosition, 220, currentBrainDumpId)
      
      // Call addIdea with text and position (handles database insertion)
      await addIdea(inputValue.trim(), { x, y })

      // Center viewport on newly placed idea
      const ideaCenterX = x + IDEA_WIDTH / 2
      const ideaCenterY = y + IDEA_HEIGHT / 2
      const screenCenterX = sidebarWidth + (window.innerWidth - sidebarWidth) / 2
      const screenCenterY = window.innerHeight / 2

      updateViewport({
        x: screenCenterX - ideaCenterX * viewport.zoom,
        y: screenCenterY - ideaCenterY * viewport.zoom,
        zoom: viewport.zoom,
      })
      
      setInputValue('')
      setAttachments([])
      
      // TODO: Handle attachments separately if needed
    } catch (error) {
      console.error('Failed to add idea:', error)
      // TODO: Show error message to user
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    // Shift+Enter allows new line (default textarea behavior)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const urls = e.dataTransfer.getData('text/uri-list')
    
    if (files.length > 0) {
      const newAttachments: LocalAttachment[] = files.map(file => ({
        id: `attachment-${Date.now()}-${Math.random()}`,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        thumbnail: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }))
      setAttachments([...attachments, ...newAttachments])
    } else if (urls) {
      const newAttachment: LocalAttachment = {
        id: `attachment-${Date.now()}-${Math.random()}`,
        type: 'url',
        name: urls,
        url: urls,
      }
      setAttachments([...attachments, newAttachment])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const newAttachments: LocalAttachment[] = files.map(file => ({
        id: `attachment-${Date.now()}-${Math.random()}`,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        thumbnail: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }))
      setAttachments([...attachments, ...newAttachments])
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text/plain')
    if (!pastedText) {
      return
    }

    const extractedUrls = extractUrlsFromText(pastedText)
    if (extractedUrls.length === 0) {
      return
    }

    e.preventDefault()

    const normalizedUrls = extractedUrls
      .map(url => ({ raw: url.trim(), normalized: normalizeUrl(url) }))
      .filter((entry): entry is { raw: string; normalized: string } => Boolean(entry.normalized))

    if (normalizedUrls.length === 0) {
      setInputValue(prev => (prev ? `${prev} ${pastedText}` : pastedText))
      return
    }

    setAttachments(prev => {
      const existingUrls = new Set(
        prev
          .filter(att => att.type === 'url' && att.url)
          .map(att => att.url as string)
      )

      const newAttachments: LocalAttachment[] = []

      normalizedUrls.forEach(({ raw, normalized }) => {
        if (existingUrls.has(normalized)) {
          return
        }

        existingUrls.add(normalized)
        newAttachments.push({
          id: `attachment-${Date.now()}-${Math.random()}`,
          type: 'url',
          name: raw,
          url: normalized,
        })
      })

      if (newAttachments.length === 0) {
        return prev
      }

      return [...prev, ...newAttachments]
    })

    const nonUrlText = normalizedUrls.reduce((result, { raw }) => {
      const pattern = new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      return result.replace(pattern, ' ')
    }, pastedText)

    const cleanedNonUrlText = nonUrlText.replace(/\s+/g, ' ').trim()

    if (cleanedNonUrlText) {
      setInputValue(prev => {
        if (!prev) return cleanedNonUrlText
        return `${prev} ${cleanedNonUrlText}`.trim()
      })
    }
  }

  const textColors = getThemeTextColor(theme)
  const glassStyle = getThemeGlassStyle(theme)
  const liquidGlassStyle = getLiquidGlassStyle(theme)

  return (
    <div 
      className="fixed bottom-8 z-50 transition-all duration-300"
      style={{ 
        left: `${sidebarWidth + 32}px`,
        right: '32px',
        maxWidth: '700px',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <div
        className="relative rounded-3xl transition-all duration-200"
        style={{
          ...liquidGlassStyle,
          boxShadow: isDragging 
            ? '0 8px 32px rgba(99, 102, 241, 0.3), 0 0 0 2px rgba(99, 102, 241, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
            : '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Main input area */}
        <div className="px-6 pt-5">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Capture your thoughts..."
            className="w-full bg-transparent outline-none text-lg placeholder-opacity-60 resize-none"
            style={{ 
              color: textColors.primary,
              minHeight: '28px',
              maxHeight: '120px',
            }}
            rows={1}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm" style={{ color: textColors.tertiary }}>
              Attach URLs, images, and supporting context.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: inputValue.length > 50 ? textColors.secondary : textColors.tertiary }}>
                {inputValue.length} / 50
              </span>
              {inputValue.length > 50 && (
                <span className="text-xs" style={{ color: textColors.secondary }}>
                  • Idea will be summarized with AI
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Attachments display - horizontal scrolling */}
        {attachments.length > 0 && (
          <div className="px-6 pt-4">
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {attachments.map((attachment) => {
                const cardGlass = getThemeGlassStyle(theme, false)
                return (
                  <div
                    key={attachment.id}
                    className="relative flex-shrink-0 backdrop-blur-xl rounded-xl p-2 group"
                    style={{ 
                      minWidth: '100px', 
                      maxWidth: '140px',
                      ...cardGlass,
                    }}
                  >
                    <Button
                      onClick={() => removeAttachment(attachment.id)}
                      size="icon"
                      variant="ghost"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      style={{
                        ...cardGlass,
                        color: textColors.primary,
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    {attachment.thumbnail ? (
                      <img
                        src={attachment.thumbnail}
                        alt={attachment.name}
                        className="w-full h-14 rounded object-cover mb-1"
                      />
                    ) : (
                      <div className="w-full h-14 rounded flex items-center justify-center mb-1" style={{ background: cardGlass.background }}>
                        <Paperclip className="h-5 w-5" style={{ color: textColors.secondary }} />
                      </div>
                    )}
                    <p className="text-xs truncate" style={{ color: textColors.secondary }}>{attachment.name}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Add files area */}
        <div className="px-6 pb-5 pt-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 transition-colors text-sm group"
            style={{ color: textColors.secondary }}
            onMouseEnter={(e) => e.currentTarget.style.color = textColors.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = textColors.secondary}
          >
            <Plus className="h-4 w-4" />
            <span>Add tabs or files</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Drag and drop hint */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center backdrop-blur-xl rounded-3xl border-2 border-dashed" style={{ background: 'rgba(99, 102, 241, 0.3)', borderColor: 'rgba(99, 102, 241, 0.6)' }}>
            <p style={{ color: textColors.primary }}>Drop files here</p>
          </div>
        )}
      </div>
    </div>
  )
})

InputBox.displayName = 'InputBox'

export default InputBox
