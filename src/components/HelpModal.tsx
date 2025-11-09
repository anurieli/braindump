'use client'

import { useEffect } from 'react'
import { useStore } from '@/store'

interface HelpSection {
  title: string
  icon: string
  items: Array<{
    title: string
    description: string
    shortcuts?: string[]
  }>
}

export default function HelpModal() {
  const activeModal = useStore(state => state.activeModal)
  const closeModal = useStore(state => state.closeModal)

  const isOpen = activeModal === 'help'

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closeModal])

  if (!isOpen) return null

  const helpSections: HelpSection[] = [
    {
      title: 'Getting Started',
      icon: '🚀',
      items: [
        {
          title: 'Welcome to Brain Dump',
          description: 'Brain Dump is a visual thinking tool that helps you capture, organize, and connect ideas on an infinite canvas. Think of it as a digital whiteboard for your thoughts.'
        },
        {
          title: 'Creating Your First Idea',
          description: 'Click anywhere on the canvas to create a new idea. Double-click to create an idea at your cursor position. Ideas can be dragged, resized, and connected to form networks of thoughts.'
        }
      ]
    },
    {
      title: 'Creating & Managing Ideas',
      icon: '💡',
      items: [
        {
          title: 'Adding Ideas',
          description: 'Click on empty canvas space to create a new idea. Each idea is automatically summarized using AI and gets semantic embeddings for smart search.',
          shortcuts: ['Click canvas', 'Double-click']
        },
        {
          title: 'Editing Ideas',
          description: 'Click on any idea to edit its content. Ideas support rich text and can contain any length of content.',
          shortcuts: ['Click idea']
        },
        {
          title: 'Selecting Multiple Ideas',
          description: 'Drag to create a selection box around multiple ideas, or hold Ctrl/Cmd+A to select all ideas.',
          shortcuts: ['Drag selection', 'Ctrl+A / Cmd+A']
        },
        {
          title: 'Deleting Ideas',
          description: 'Select ideas and press Delete, or use the delete button in the detail modal.',
          shortcuts: ['Delete key']
        }
      ]
    },
    {
      title: 'Connecting Ideas',
      icon: '🔗',
      items: [
        {
          title: 'Creating Connections',
          description: 'Right-click on an idea and select "Connect" to start creating a relationship. Drag the connection line to another idea to complete it.'
        },
        {
          title: 'Relationship Types',
          description: 'Choose from predefined relationship types: "related_to" (general connection), "prerequisite_for" (dependencies), "inspired_by" (creative links), "blocks" (obstacles), "similar_to" (comparisons), and "depends_on" (requirements).'
        },
        {
          title: 'Connection Notes',
          description: 'Add optional notes to connections to explain the specific nature of the relationship between ideas.'
        },
        {
          title: 'Custom Relationship Types',
          description: 'Create your own custom relationship types in Settings if the predefined ones don\'t fit your needs.'
        }
      ]
    },
    {
      title: 'Canvas Navigation',
      icon: '🗺️',
      items: [
        {
          title: 'Panning',
          description: 'Hold Ctrl/Cmd and drag to pan around the canvas. The canvas is infinite, so you can organize ideas in any spatial arrangement.',
          shortcuts: ['Ctrl+Drag']
        },
        {
          title: 'Zooming',
          description: 'Use Ctrl/Cmd+Scroll wheel to zoom in and out. Reset zoom to 100% with Ctrl+0.',
          shortcuts: ['Ctrl+Scroll', 'Ctrl+0']
        },
        {
          title: 'Reset View',
          description: 'Center the view and reset zoom to 100% to see your entire brain dump clearly.',
          shortcuts: ['Ctrl+0']
        }
      ]
    },
    {
      title: 'Brain Dump Management',
      icon: '📁',
      items: [
        {
          title: 'Creating New Dumps',
          description: 'Create separate brain dumps for different projects, topics, or contexts. Each dump has its own canvas, ideas, and connections.',
          shortcuts: ['Ctrl+N']
        },
        {
          title: 'Duplicating Dumps',
          description: 'Make copies of existing brain dumps to experiment with different approaches or create templates.',
          shortcuts: ['Ctrl+D']
        },
        {
          title: 'Renaming Dumps',
          description: 'Click the edit icon next to the dump name in the header to rename your brain dump.'
        },
        {
          title: 'Switching Between Dumps',
          description: 'Use the side panel to navigate between your different brain dumps.'
        }
      ]
    },
    {
      title: 'AI Features',
      icon: '🤖',
      items: [
        {
          title: 'Automatic Summarization',
          description: 'Every idea you create is automatically summarized by AI to create a concise title and semantic embedding for better search.'
        },
        {
          title: 'Semantic Search',
          description: 'Ideas are embedded in vector space, enabling intelligent search based on meaning rather than just keywords.'
        },
        {
          title: 'Smart Connections',
          description: 'AI helps suggest relevant connections between ideas based on their semantic similarity.'
        },
        {
          title: 'Attachment Processing',
          description: 'Upload images, PDFs, and other files to ideas. The AI analyzes and summarizes their content automatically.'
        }
      ]
    },
    {
      title: 'Interface & Controls',
      icon: '🎛️',
      items: [
        {
          title: 'Undo/Redo',
          description: 'Made a mistake? Use undo and redo to step backwards and forwards through your actions.',
          shortcuts: ['Ctrl+Z', 'Ctrl+Shift+Z']
        },
        {
          title: 'Themes',
          description: 'Switch between light and dark themes, or choose from various gradient backgrounds for different moods.',
          shortcuts: ['Ctrl+Shift+T']
        },
        {
          title: 'Grid Toggle',
          description: 'Show or hide the grid overlay to help align your ideas precisely.',
          shortcuts: ['Ctrl+G']
        },
        {
          title: 'Keyboard Shortcuts',
          description: 'View all available keyboard shortcuts by clicking the keyboard icon in the control panel.',
          shortcuts: ['Click ⌨️ button']
        }
      ]
    },
    {
      title: 'Advanced Features',
      icon: '⚡',
      items: [
        {
          title: 'Attachment Ideas',
          description: 'Create ideas from files by dragging and dropping images, PDFs, or other documents onto the canvas.'
        },
        {
          title: 'Batch Operations',
          description: 'Select multiple ideas to move, delete, or apply operations to them simultaneously.'
        },
        {
          title: 'Session Tracking',
          description: 'Ideas created in the same session are grouped together, helping you understand your thought patterns over time.'
        },
        {
          title: 'Export & Sharing',
          description: 'Export your brain dumps as images or share them with others (coming soon).'
        }
      ]
    },
    {
      title: 'Tips & Best Practices',
      icon: '💡',
      items: [
        {
          title: 'Spatial Organization',
          description: 'Use the spatial layout of ideas to represent relationships. Place related ideas close together and use connections for explicit relationships.'
        },
        {
          title: 'Start Small',
          description: 'Begin with a central idea and gradually add related thoughts. Don\'t try to capture everything at once.'
        },
        {
          title: 'Use Connections Wisely',
          description: 'Not every relationship needs a connection. Use them for meaningful relationships like dependencies, inspirations, or conflicts.'
        },
        {
          title: 'Regular Review',
          description: 'Periodically review your brain dumps to discover new connections and insights that weren\'t obvious when you first created the ideas.'
        },
        {
          title: 'Multiple Perspectives',
          description: 'Create separate brain dumps for different aspects of the same problem to explore various approaches and solutions.'
        }
      ]
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <span className="text-2xl">❓</span>
            Brain Dump Help Guide
          </h2>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2"
            title="Close (Esc)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-8">
            {helpSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="border-b border-gray-100 dark:border-gray-700 pb-8 last:border-b-0">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{section.icon}</span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {section.title}
                  </h3>
                </div>

                <div className="grid gap-4 ml-8">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {item.title}
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {item.description}
                          </p>
                          {item.shortcuts && item.shortcuts.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.shortcuts.map((shortcut, shortcutIndex) => (
                                <kbd key={shortcutIndex} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono text-gray-600 dark:text-gray-400">
                                  {shortcut}
                                </kbd>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 rounded-b-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💡 Pro tip: Use the keyboard shortcuts panel (⌨️) for quick reference
            </p>
            <button
              onClick={closeModal}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

