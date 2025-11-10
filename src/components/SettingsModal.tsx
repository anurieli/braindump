'use client'

import { useEffect } from 'react'
import { useStore } from '@/store'
import { themes, ThemeType } from '@/lib/themes'

export default function SettingsModal() {
  const activeModal = useStore(state => state.activeModal)
  const closeModal = useStore(state => state.closeModal)
  
  // UI Settings
  const theme = useStore(state => state.theme)
  const isGridVisible = useStore(state => state.isGridVisible)
  const enableAnimations = useStore(state => state.enableAnimations)
  const renderQuality = useStore(state => state.renderQuality)
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId)
  const isAutoRelateMode = useStore(state => state.isAutoRelateMode)
  
  // Actions
  const setTheme = useStore(state => state.setTheme)
  const setGridVisible = useStore(state => state.setGridVisible)
  const toggleAnimations = useStore(state => state.toggleAnimations)
  const setRenderQuality = useStore(state => state.setRenderQuality)
  const updateBrainDumpTheme = useStore(state => state.updateBrainDumpTheme)
  const setAutoRelateMode = useStore(state => state.setAutoRelateMode)
  const savePreferencesToDB = useStore(state => state.savePreferencesToDB)
  
  const isOpen = activeModal === 'settings'

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            ⚙️ Settings
          </h2>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Appearance Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Appearance
            </h3>
            <div className="space-y-4">
              
              {/* Theme Setting */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Theme
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Choose your preferred color scheme
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(themes).map((themeOption) => (
                    <button
                      key={themeOption.name}
                      onClick={async () => {
                        setTheme(themeOption.name)
                        // Save theme to current brain dump if available
                        if (currentBrainDumpId) {
                          await updateBrainDumpTheme(currentBrainDumpId, themeOption.name)
                        }
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        theme === themeOption.name
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0"
                          style={{
                            background: themeOption.gradient || themeOption.backgroundColor,
                          }}
                        />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {themeOption.displayName}
                        </span>
                        {theme === themeOption.name && (
                          <span className="ml-auto text-blue-500">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Visibility */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show Grid
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Display background grid on canvas
                  </p>
                </div>
                <button
                  onClick={() => setGridVisible(!isGridVisible)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isGridVisible ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isGridVisible ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Auto-Relate Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-Relate Mode
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Automatically relate new ideas to selected parent
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setAutoRelateMode(!isAutoRelateMode)
                    // Save preference to database
                    try {
                      const { data: { user } } = await import('@/lib/supabase/client').then(m => m.supabase.auth.getUser())
                      if (user) {
                        await savePreferencesToDB(user.id)
                      }
                    } catch (error) {
                      console.error('Failed to save auto-relate preference:', error)
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isAutoRelateMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isAutoRelateMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Performance Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Performance
            </h3>
            <div className="space-y-4">
              
              {/* Animations */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Animations
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enable smooth transitions and animations
                  </p>
                </div>
                <button
                  onClick={toggleAnimations}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enableAnimations ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enableAnimations ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Render Quality */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Render Quality
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Adjust rendering quality for performance
                  </p>
                </div>
                <select
                  value={renderQuality}
                  onChange={(e) => setRenderQuality(e.target.value as 'low' | 'medium' | 'high')}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">🚀 Fast</option>
                  <option value="medium">⚖️ Balanced</option>
                  <option value="high">✨ High Quality</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 rounded-b-lg">
          <div className="flex justify-end">
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}