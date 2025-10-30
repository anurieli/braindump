import { createServerClient } from '@/lib/supabase'

export async function executeQuery(query: string, params: any[] = []) {
  const supabase = createServerClient()
  
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query: query,
      params: params
    })
    
    if (error) {
      throw error
    }
    
    return { rows: data }
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}