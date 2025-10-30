'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Search, Plus, Paperclip, ArrowUp } from 'lucide-react'
import { useStore, useStoreActions } from '@/store'

export function QuickInput() {
  const [inputText, setInputText] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { addIdea } = useStoreActions()
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId)
  const viewport = useStore(state => state.viewport)

  const handleSubmit = async () => {
    if (!inputText.trim() && attachments.length === 0) return
    if (!currentBrainDumpId) {
      console.error('No brain dump selected')
      return
    }

    setIsLoading(true)
    try {
      // Calculate position for new idea (center of current viewport in world coordinates)
      // In Konva, negative stage position means we've moved right/down in world space
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom

      // Add idea with text
      const ideaId = await addIdea(inputText.trim(), {
        x: centerX,
        y: centerY
      })

      // TODO: Handle attachments upload
      if (attachments.length > 0) {
        console.log('Attachments to upload:', attachments)
        // Will implement attachment upload in next iteration
      }

      // Clear input after successful submission
      setInputText('')
      setAttachments([])
      textareaRef.current?.focus()
    } catch (error) {
      console.error('Failed to create idea:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  if (!currentBrainDumpId) {
    return null // Don't show input if no brain dump is selected
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div 
          className={`
            bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl 
            rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50
            transition-all duration-200
            ${isDragActive ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex items-end gap-2 p-3 md:p-4">
            {/* Search Icon */}
            <div className="flex-shrink-0 mb-2 text-gray-400 dark:text-gray-500">
              <Search className="w-5 h-5" />
            </div>

            {/* Input Field */}
            <div className="flex-grow">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add an idea..."
                className="w-full bg-transparent border-0 outline-none resize-none 
                         text-gray-900 dark:text-gray-100 placeholder-gray-400 
                         dark:placeholder-gray-500 text-base leading-relaxed
                         max-h-32 min-h-[24px]"
                rows={1}
                style={{
                  height: 'auto',
                  overflow: 'hidden'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = target.scrollHeight + 'px'
                }}
                disabled={isLoading}
              />

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 
                               dark:bg-gray-800 rounded-lg text-xs text-gray-600 
                               dark:text-gray-400"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="ml-1 text-gray-400 hover:text-gray-600 
                                 dark:hover:text-gray-300 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0 mb-2">
              {/* File Attachment Button */}
              <button
                onClick={handleFileSelect}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                         hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg 
                         transition-all duration-150"
                disabled={isLoading}
              >
                <Plus className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
                className={`
                  p-2 rounded-lg transition-all duration-150
                  ${(inputText.trim() || attachments.length > 0) && !isLoading
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  }
                `}
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drag & Drop Overlay */}
          {isDragActive && (
            <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/20 
                          rounded-2xl pointer-events-none flex items-center 
                          justify-center">
              <div className="text-blue-500 dark:text-blue-400 font-medium">
                Drop files here to attach
              </div>
            </div>
          )}
        </div>

        {/* Mobile-specific helper text */}
        <div className="md:hidden text-center text-xs text-gray-400 dark:text-gray-600 mt-2">
          Tap + to attach files • Enter to submit
        </div>
      </div>
    </div>
  )
}