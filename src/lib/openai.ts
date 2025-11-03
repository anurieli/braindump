// Client-side API helpers that call secure server-side routes
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await fetch('/api/ai/generate-embedding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to generate embedding: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

export const generateSummary = async (text: string): Promise<string> => {
  try {
    const response = await fetch('/api/ai/generate-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to generate summary: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.summary
  } catch (error) {
    console.error('Error generating summary:', error)
    throw error
  }
}

export const cleanGrammar = (text: string): string => {
  // Basic grammar cleaning without changing meaning
  let cleaned = text.trim()
  
  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  
  // Add period if missing and doesn't end with punctuation
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += '.'
  }
  
  // Fix multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  return cleaned
}