import OpenAI from 'openai'

let openaiClient: OpenAI | null = null

const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable')
    }
    
    openaiClient = new OpenAI({
      apiKey,
    })
  }
  
  return openaiClient
}

// Helper functions for common operations
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const client = getOpenAIClient()
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

export const generateSummary = async (text: string): Promise<string> => {
  try {
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise summaries of text. Keep summaries under 100 words and capture the main ideas.',
        },
        {
          role: 'user',
          content: `Please summarize this text: ${text}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    })
    
    return response.choices[0].message.content || text
  } catch (error) {
    console.error('Error generating summary:', error)
    throw error
  }
}

export const cleanContent = async (text: string): Promise<string> => {
  try {
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that fixes grammar and improves clarity while maintaining the original meaning and tone. Make minimal changes.',
        },
        {
          role: 'user',
          content: `Please fix the grammar and improve clarity: ${text}`,
        },
      ],
      max_tokens: Math.max(text.length * 2, 100),
      temperature: 0.1,
    })
    
    return response.choices[0].message.content || text
  } catch (error) {
    console.error('Error cleaning grammar:', error)
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