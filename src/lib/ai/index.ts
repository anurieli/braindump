import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions'
import { SUMMARIZE_IDEA_PROMPT } from './prompts'
import { runChatTask, runEmbeddingTask } from './runner'
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

export * from './types'
export * from './models'
export * from './prompts'


