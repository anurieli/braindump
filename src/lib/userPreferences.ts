import { supabase } from '@/lib/supabase/client'
import { UserPreferences, ThemeType } from '@/types'

// Default user preferences
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  gridSettings: {
    isVisible: false,
    patternType: 'none',
  },
  ui: {
    isSidebarOpen: true,
    isControlPanelOpen: false,
    enableAnimations: true,
    renderQuality: 'high',
    autoRelateMode: false,
  },
}

/**
 * Get user preferences from the database
 * @param userId - The user ID
 * @returns UserPreferences object or default preferences if none exist
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('metadata')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching user preferences:', error)
      return DEFAULT_PREFERENCES
    }
    
    // Extract preferences from metadata, merge with defaults
    const preferences = data?.metadata?.preferences as UserPreferences || {}
    
    return {
      theme: preferences.theme || DEFAULT_PREFERENCES.theme,
      gridSettings: {
        isVisible: preferences.gridSettings?.isVisible ?? DEFAULT_PREFERENCES.gridSettings.isVisible,
        patternType: preferences.gridSettings?.patternType || DEFAULT_PREFERENCES.gridSettings.patternType,
      },
      ui: {
        isSidebarOpen: preferences.ui?.isSidebarOpen ?? DEFAULT_PREFERENCES.ui.isSidebarOpen,
        isControlPanelOpen: preferences.ui?.isControlPanelOpen ?? DEFAULT_PREFERENCES.ui.isControlPanelOpen,
        enableAnimations: preferences.ui?.enableAnimations ?? DEFAULT_PREFERENCES.ui.enableAnimations,
        renderQuality: preferences.ui?.renderQuality || DEFAULT_PREFERENCES.ui.renderQuality,
        autoRelateMode: preferences.ui?.autoRelateMode ?? DEFAULT_PREFERENCES.ui.autoRelateMode,
      },
    }
  } catch (error) {
    console.error('Unexpected error fetching user preferences:', error)
    return DEFAULT_PREFERENCES
  }
}

/**
 * Update user preferences in the database
 * @param userId - The user ID
 * @param preferences - Partial preferences to update
 */
export async function updateUserPreferences(
  userId: string, 
  preferences: Partial<UserPreferences>
): Promise<void> {
  
  try {
    // First, get the current metadata
    const { data: currentData, error: fetchError } = await supabase
      .from('users')
      .select('metadata')
      .eq('id', userId)
      .single()
    
    if (fetchError) {
      console.error('Error fetching current user metadata:', fetchError)
      return
    }
    
    // Merge existing metadata with new preferences
    const currentMetadata = currentData?.metadata || {}
    const currentPreferences = currentMetadata.preferences || {}
    
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
      // Deep merge nested objects
      gridSettings: {
        ...currentPreferences.gridSettings,
        ...preferences.gridSettings,
      },
      ui: {
        ...currentPreferences.ui,
        ...preferences.ui,
      },
    }
    
    const updatedMetadata = {
      ...currentMetadata,
      preferences: updatedPreferences,
    }
    
    // Update the metadata in the database
    const { error } = await supabase
      .from('users')
      .update({ metadata: updatedMetadata })
      .eq('id', userId)
    
    if (error) {
      console.error('Error updating user preferences:', error)
    }
  } catch (error) {
    console.error('Unexpected error updating user preferences:', error)
  }
}

/**
 * Update only theme preference (convenience function)
 */
export async function updateThemePreference(userId: string, theme: ThemeType): Promise<void> {
  return updateUserPreferences(userId, { theme })
}

/**
 * Update only grid settings preference (convenience function)
 */
export async function updateGridPreference(
  userId: string, 
  gridSettings: Partial<UserPreferences['gridSettings']>
): Promise<void> {
  return updateUserPreferences(userId, { gridSettings })
}

/**
 * Update only UI preferences (convenience function)
 */
export async function updateUIPreference(
  userId: string, 
  ui: Partial<UserPreferences['ui']>
): Promise<void> {
  return updateUserPreferences(userId, { ui })
}