import type { AIModelConfig, AITask } from './types'

const MODEL_CONFIGS: Record<AITask, AIModelConfig> = {
  summarization: {
    key: 'summarization',
    id: 'gpt-4',
    provider: 'openai',
    type: 'chat',
    pricing: {
      input: 0.00003,
      output: 0.00006,
    },
    defaultParams: {
      max_tokens: 150,
      temperature: 0.3,
    },
  },
  embedding: {
    key: 'embedding',
    id: 'text-embedding-3-small',
    provider: 'openai',
    type: 'embedding',
    pricing: {
      input: 0.00000002,
      output: 0,
    },
    defaultParams: {
      dimensions: 1536,
    },
  },
  'image-generation': {
    key: 'image-generation',
    id: 'dall-e-3',
    provider: 'openai',
    type: 'image',
    pricing: {
      input: 0,
      output: 0.04, // $0.04 per standard 1024x1024 image
    },
    defaultParams: {},
  },
}

export const getModelConfig = (task: AITask): AIModelConfig => {
  const config = MODEL_CONFIGS[task]

  if (!config) {
    throw new Error(`No AI model configured for task: ${task}`)
  }

  return config
}

export const listModelConfigs = (): AIModelConfig[] => Object.values(MODEL_CONFIGS)


