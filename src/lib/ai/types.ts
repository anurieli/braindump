export type AIProvider = 'openai'

export type AIModelType = 'chat' | 'embedding' | 'image'

export interface AIModelConfig {
  key: string
  id: string
  provider: AIProvider
  type: AIModelType
  pricing: {
    input: number
    output: number
  }
  defaultParams?: Record<string, unknown>
}

export interface AIRunUsage {
  inputTokens?: number
  outputTokens?: number
  cost?: number
}

export interface AIRunResult<T> {
  data: T
  model: AIModelConfig
  usage: AIRunUsage
}

export type AITask = 'summarization' | 'embedding'


