import { useEffect, useRef } from 'react'
import { useStore } from '@/store'
import { supabase } from '@/lib/supabase/client'

/**
 * Hook to load user preferences on authentication
 * Manual saving to prevent infinite loops
 */
export function useUserPreferences() {
  const hasLoadedRef = useRef(false)
  const userIdRef = useRef<string | null>(null)
  
  const loadUserPreferences = useStore(state => state.loadUserPreferences)

  // Load preferences when user is authenticated (one-time only)
  useEffect(() => {
    let mounted = true
    
    const initializePreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (mounted && user && !hasLoadedRef.current) {
          console.log('Loading user preferences for:', user.id)
          userIdRef.current = user.id
          hasLoadedRef.current = true
          // Load preferences in background without blocking
          loadUserPreferences(user.id).catch(error => {
            console.error('Background preference load failed:', error)
            hasLoadedRef.current = false // Reset to allow retry
          })
        }
      } catch (error) {
        console.error('Failed to initialize user preferences:', error)
      }
    }

    initializePreferences()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      if (event === 'SIGNED_IN' && session?.user && !hasLoadedRef.current) {
        console.log('Loading preferences on sign in for:', session.user.id)
        userIdRef.current = session.user.id
        hasLoadedRef.current = true
        // Load preferences in background without blocking
        loadUserPreferences(session.user.id).catch(error => {
          console.error('Failed to load preferences on sign in:', error)
          hasLoadedRef.current = false // Reset to allow retry
        })
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing preference state')
        hasLoadedRef.current = false
        userIdRef.current = null
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadUserPreferences])

  return {
    isLoaded: hasLoadedRef.current,
    userId: userIdRef.current,
  }
}

/**
 * Manual save function to be called when user explicitly changes settings
 */
export async function saveUserPreferencesManually() {
  const state = useStore.getState()
  const userId = typeof state.loadUserPreferences === 'function' ? await getCurrentUserId() : null
  
  if (userId) {
    await state.savePreferencesToDB(userId)
  }
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch {
    return null
  }
}