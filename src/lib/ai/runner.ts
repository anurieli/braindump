import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions'
import type { EmbeddingCreateParams } from 'openai/resources/embeddings'
import { getOpenAIClient } from './clients'
import { getModelConfig } from './models'
import type { AIRunResult, AIRunUsage, AITask } from './types'

type ChatTask = Extract<AITask, 'summarization'>
type EmbeddingTask = Extract<AITask, 'embedding'>

export interface ChatRunOptions {
  messages: ChatCompletionCreateParamsNonStreaming['messages']
  overrides?: Partial<Omit<ChatCompletionCreateParamsNonStreaming, 'messages' | 'model'>>
}

export interface EmbeddingRunOptions {
  input: EmbeddingCreateParams['input']
  overrides?: Partial<Omit<EmbeddingCreateParams, 'input' | 'model'>>
}

const calculateCost = (
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  task: AITask
): number => {
  const model = getModelConfig(task)
  const inputCost = (inputTokens || 0) * model.pricing.input
  const outputCost = (outputTokens || 0) * model.pricing.output
  return inputCost + outputCost
}

const buildUsage = (
  task: AITask,
  inputTokens?: number,
  outputTokens?: number
): AIRunUsage => ({
  inputTokens,
  outputTokens,
  cost: calculateCost(inputTokens, outputTokens, task),
})

export const runChatTask = async (
  task: ChatTask,
  { messages, overrides }: ChatRunOptions
): Promise<AIRunResult<string>> => {
  const model = getModelConfig(task)
  const client = getOpenAIClient()

  const params: ChatCompletionCreateParamsNonStreaming = {
    model: model.id,
    messages,
    ...(model.defaultParams ?? {}),
    ...(overrides ?? {}),
  }

  const response = await client.chat.completions.create(params)
  const choice = response.choices[0]
  const text = choice?.message?.content ?? ''

  return {
    data: text.trim(),
    model,
    usage: buildUsage(task, response.usage?.prompt_tokens, response.usage?.completion_tokens),
  }
}

export const runEmbeddingTask = async (
  task: EmbeddingTask,
  { input, overrides }: EmbeddingRunOptions
): Promise<AIRunResult<number[]>> => {
  const model = getModelConfig(task)
  const client = getOpenAIClient()

  const params: EmbeddingCreateParams = {
    model: model.id,
    input,
    ...(model.defaultParams ?? {}),
    ...(overrides ?? {}),
  }

  const response = await client.embeddings.create(params)
  const embedding = response.data[0]?.embedding ?? []

  return {
    data: embedding,
    model,
    usage: buildUsage(task, response.usage?.prompt_tokens, response.usage?.completion_tokens),
  }
}


