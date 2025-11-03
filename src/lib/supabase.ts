import { createClient } from '@supabase/supabase-js'

// Re-export the client-side Supabase client to maintain compatibility
// This ensures only one instance is created
export { supabase } from './supabase/client'

// For server-side operations that need elevated permissions
export const createServerClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabaseUrl = `https://${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID}.supabase.co`
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_PROJECT_ID environment variable')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}