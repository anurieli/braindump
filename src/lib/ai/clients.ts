import OpenAI from 'openai'

let openAIClient: OpenAI | null = null

export const getOpenAIClient = (): OpenAI => {
  if (openAIClient) {
    return openAIClient
  }

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable')
  }

  openAIClient = new OpenAI({ apiKey })
  return openAIClient
}


