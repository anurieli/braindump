'use client'

import React, { useState, KeyboardEvent, useRef, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react'
import { Plus, X, Paperclip } from 'lucide-react'
import { useStore, useStoreActions } from '@/store'
import type { ThemeType } from '@/types'
import { Button } from '@/components/ui/button'
import { findNonOverlappingPosition as findPosition } from '@/lib/idea-positioning'
import { themes as themeDefinitions } from '@/lib/themes'

const IDEA_WIDTH = 200
const IDEA_HEIGHT = 100

function getThemeTextColor(theme: ThemeType): {
  primary: string
  secondary: string
  tertiary: string
} {
  const themeDef = themeDefinitions[theme]
  const isDark = themeDef?.isDark ?? false
  
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
  const themeDef = themeDefinitions[theme]
  const isDark = themeDef?.isDark ?? false
  
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
  metaTitle?: string
  metaDescription?: string
}

function normalizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  const candidate = (trimmed.startsWith('http://') || trimmed.startsWith('https://'))
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
  // Matches:
  // - http(s)://...
  // - www.domain.tld/...
  // - bare domain.tld/...
  // Requires a TLD of at least 2 letters and a token boundary afterwards
  const urlPattern = /\b(?:(?:https?:\/\/)|(?:www\.))?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,})(?::\d{2,5})?(?:\/[^\s]*)?(?=$|\s|[),.;!?])/gi
  const matches = text.match(urlPattern) || []
  // Prevent premature matches like "www.g" (www with no second dot)
  const filtered = matches.filter(raw => {
    const lower = raw.toLowerCase()
    if (lower.startsWith('www.')) {
      // Must contain another dot after 'www.'
      return lower.indexOf('.', 4) !== -1
    }
    return true
  })
  return filtered
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
  
  // Auto-relate state
  const isAutoRelateMode = useStore(state => state.isAutoRelateMode)
  const autoRelateParentId = useStore(state => state.autoRelateParentId)
  const { addEdge, setAutoRelateMode, clearAutoRelateMode, savePreferencesToDB } = useStoreActions()
  
  const sidebarWidth = isSidebarOpen ? 320 : 0 // 320px is the width from SidePanel

  // Helper function to get parent idea for placeholder text
  const getParentIdea = () => {
    if (!autoRelateParentId || !currentBrainDumpId) return null
    return Object.values(ideas).find(idea => 
      idea.id === autoRelateParentId && 
      idea.brain_dump_id === currentBrainDumpId
    )
  }

  const parentIdea = getParentIdea()

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
  
  // Enrich URL attachments with link preview metadata in background
  useEffect(() => {
    let cancelled = false
    const fetchPreviews = async () => {
      const pending = attachments.filter(a => a.type === 'url' && a.url && !a.thumbnail && !a.metaTitle)
      for (const att of pending) {
        try {
          const res = await fetch(`/api/link-preview?url=${encodeURIComponent(att.url as string)}`)
          if (!res.ok) continue
          const data = await res.json()
          if (cancelled) return
          setAttachments(prev => prev.map(p => {
            if (p.id !== att.id) return p
            return {
              ...p,
              thumbnail: data.image || data.thumbnail || data.favicon || p.thumbnail,
              metaTitle: data.title || p.metaTitle,
              metaDescription: data.description || p.metaDescription,
              // keep url/name
            }
          }))
        } catch {
          // ignore failures silently
        }
      }
    }
    if (attachments.some(a => a.type === 'url')) {
      fetchPreviews()
    }
    return () => { cancelled = true }
  }, [attachments])

  const handleSubmit = async () => {
    if (!currentBrainDumpId) {
      return
    }
    
    try {
      // Final extraction on submit to capture trailing URL without space
      const extracted = extractUrlsFromText(inputValue)
      if (extracted.length > 0) {
        const normalizedUrls = extracted
          .map(url => ({ raw: url.trim(), normalized: normalizeUrl(url) }))
          .filter((entry): entry is { raw: string; normalized: string } => Boolean(entry.normalized))
        if (normalizedUrls.length > 0) {
          setAttachments(prev => {
            const existingUrls = new Set(
              prev
                .filter(att => att.type === 'url' && att.url)
                .map(att => att.url as string)
            )
            const newAttachments: LocalAttachment[] = []
            normalizedUrls.forEach(({ raw, normalized }) => {
              if (existingUrls.has(normalized)) return
              existingUrls.add(normalized)
              newAttachments.push({
                id: `attachment-${Date.now()}-${Math.random()}`,
                type: 'url',
                name: raw,
                url: normalized,
              })
            })
            if (newAttachments.length === 0) return prev
            return [...prev, ...newAttachments]
          })
          // Remove raw URLs from the text before creating the idea
          const cleaned = normalizedUrls.reduce((acc, { raw }) => {
            const pattern = new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
            return acc.replace(pattern, ' ')
          }, inputValue).replace(/\s+/g, ' ').trim()
          if (!cleaned) {
            // If text is only URLs, keep a small placeholder so idea creation isn't blocked
            setInputValue('(link)')
          } else {
            setInputValue(cleaned)
          }
        }
      }

      const finalText = (inputValue || '').trim()
      if (!finalText) {
        return
      }

      // Calculate viewport center, accounting for sidebar
      const viewportCenterX = (sidebarWidth + (window.innerWidth - sidebarWidth) / 2 - viewport.x) / viewport.zoom
      const viewportCenterY = (window.innerHeight / 2 - viewport.y) / viewport.zoom
      
      // Find a non-overlapping position using smart placement
      const { x, y } = findPosition(ideas, viewportCenterX, viewportCenterY, lastPlacedIdeaPosition, 220, currentBrainDumpId)
      
      // Call addIdea with text and position (handles database insertion)
      const ideaId = await addIdea((inputValue || '').trim(), { x, y })
      
      // Create edge connection if in auto-relate mode
      if (isAutoRelateMode && autoRelateParentId && ideaId) {
        try {
          await addEdge(autoRelateParentId, ideaId, 'relates-to')
          console.log(`🔗 Created auto-relate connection: ${autoRelateParentId} -> ${ideaId}`)
        } catch (error) {
          console.error('Failed to create auto-relate edge:', error)
        }
      }

      // Create URL attachments in background
      const urlAttachments = attachments.filter(a => a.type === 'url' && a.url)
      for (const att of urlAttachments) {
        try {
          const form = new FormData()
          form.append('idea_id', ideaId)
          form.append('type', 'url')
          form.append('url', att.url as string)
          // server will enrich metadata
          await fetch('/api/attachments', {
            method: 'POST',
            body: form
          })
        } catch {
          // non-blocking
        }
      }

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
        thumbnail: undefined,
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
        thumbnail: undefined,
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
            onChange={(e) => {
              const next = e.target.value
              // Only process when user finishes a token: space or newline
              const endsWithBoundary = /\s$/.test(next)
              if (!endsWithBoundary) {
                setInputValue(next)
                return
              }

              // Extract complete URLs on boundary
              const extracted = extractUrlsFromText(next)
              if (extracted.length === 0) {
                setInputValue(next)
                return
              }

              const normalizedUrls = extracted
                .map(url => ({ raw: url.trim(), normalized: normalizeUrl(url) }))
                .filter((entry): entry is { raw: string; normalized: string } => Boolean(entry.normalized))

              if (normalizedUrls.length === 0) {
                setInputValue(next)
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
                  if (existingUrls.has(normalized)) return
                  existingUrls.add(normalized)
                  newAttachments.push({
                    id: `attachment-${Date.now()}-${Math.random()}`,
                    type: 'url',
                    name: raw,
                    url: normalized,
                  })
                })
                if (newAttachments.length === 0) return prev
                return [...prev, ...newAttachments]
              })

              // Remove raw URL tokens from input
              const cleaned = normalizedUrls.reduce((acc, { raw }) => {
                const pattern = new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
                return acc.replace(pattern, ' ')
              }, next).replace(/\s+/g, ' ').trimStart()

              setInputValue(cleaned)
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isAutoRelateMode && parentIdea 
              ? `Add related idea to "${parentIdea.text.slice(0, 30)}${parentIdea.text.length > 30 ? '...' : ''}"` 
              : "Capture your thoughts..."}
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
              <span style={{ color: inputValue.length > 60 ? textColors.secondary : textColors.tertiary }}>
                {inputValue.length} / 60
              </span>
              {inputValue.length > 60 && (
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
                const isUrl = attachment.type === 'url'
                const href = attachment.url
                const displayName = attachment.metaTitle || attachment.name || (href ? new URL(href).hostname : '')
                return (
                  <div
                    key={attachment.id}
                    className="relative flex-shrink-0 backdrop-blur-xl rounded-xl p-2 group"
                    style={{ 
                      minWidth: '120px', 
                      maxWidth: '140px',
                      ...cardGlass,
                      border: isUrl ? '1px solid rgba(59, 130, 246, 0.7)' : cardGlass.border,
                      boxShadow: isUrl ? '0 0 0 1px rgba(59, 130, 246, 0.25) inset' : cardGlass.boxShadow,
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
                    {(() => {
                      const imageEl = attachment.thumbnail ? (
                        <img
                          src={attachment.thumbnail}
                          alt={displayName}
                          className="w-full h-14 rounded object-cover mb-1"
                          onError={() => {
                            // Fallback to no-thumbnail so we render icon instead of broken image
                            setAttachments(prev => prev.map(p => p.id === attachment.id ? { ...p, thumbnail: undefined } : p))
                          }}
                        />
                      ) : (
                        <div className="w-full h-14 rounded flex items-center justify-center mb-1" style={{ background: cardGlass.background }}>
                          <Paperclip className="h-5 w-5" style={{ color: isUrl ? '#3b82f6' : textColors.secondary }} />
                        </div>
                      )
                      return isUrl && href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          {imageEl}
                        </a>
                      ) : imageEl
                    })()}
                    {isUrl && href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
                        <p className="text-xs truncate" style={{ color: '#3b82f6' }}>{displayName}</p>
                      </a>
                    ) : (
                      <p className="text-xs truncate" style={{ color: textColors.secondary }}>{attachment.name}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Add files area */}
        <div className="px-6 pb-5 pt-4">
          <div className="flex items-center justify-between">
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
            
            {/* Auto-Relate Toggle */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={async () => {
                  console.log('🔄 Toggle clicked! Current state:', isAutoRelateMode)
                  if (isAutoRelateMode) {
                    clearAutoRelateMode()
                    console.log('🔴 Auto-relate disabled')
                  } else {
                    setAutoRelateMode(true)
                    console.log('🟢 Auto-relate enabled')
                  }
                  
                  // Save preference to database
                  try {
                    const { supabase } = await import('@/lib/supabase/client')
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                      await savePreferencesToDB(user.id)
                    }
                  } catch (error) {
                    console.error('Failed to save auto-relate preference:', error)
                  }
                }}
                className={`
                  relative w-12 h-6 rounded-full transition-all duration-200 ease-in-out focus:outline-none
                  ${isAutoRelateMode 
                    ? 'bg-blue-500 shadow-lg' 
                    : 'bg-gray-300 dark:bg-gray-600'
                  }
                `}
                title={isAutoRelateMode ? "Disable Auto-Relate Mode" : "Enable Auto-Relate Mode"}
              >
                <div
                  className={`
                    absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md 
                    transition-transform duration-200 ease-in-out
                    ${isAutoRelateMode ? 'translate-x-6' : 'translate-x-0'}
                  `}
                />
              </button>
              <span className="text-xs" style={{ color: textColors.tertiary }}>auto-relate</span>
              

            </div>
          </div>
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
