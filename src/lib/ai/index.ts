import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions'
import { SUMMARIZE_IDEA_PROMPT } from './prompts'
import { runChatTask, runEmbeddingTask, runImageTask } from './runner'
import type { AIRunResult } from './types'

export interface SummarizeOptions {
  overrides?: Partial<Omit<ChatCompletionCreateParamsNonStreaming, 'messages' | 'model'>>
}

export const summarizeText = async (
  text: string,
  { overrides }: SummarizeOptions = {}
): Promise<AIRunResult<string>> => {
  const messages: ChatCompletionCreateParamsNonStreaming['messages'] = [
    { role: 'system', content: SUMMARIZE_IDEA_PROMPT },
    { role: 'user', content: text },
  ]
  return runChatTask('summarization', { messages, overrides })
}

export const createEmbedding = async (
  text: string
): Promise<AIRunResult<number[]>> => {
  return runEmbeddingTask('embedding', { input: text })
}

export interface GenerateImageOptions {
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
}

export const generateImage = async (
  prompt: string,
  options?: GenerateImageOptions
): Promise<AIRunResult<string>> => {
  return runImageTask('image-generation', { 
    prompt, 
    overrides: options 
  })
}

export * from './types'
export * from './models'
export * from './prompts'


