import { createEmbedding, summarizeText } from '@/lib/ai'

interface Job {
  id: string
  type: 'summarization' | 'embedding'
  data: any
  retries: number
  maxRetries: number
  createdAt: Date
  processedAt?: Date
  error?: string
}

class BackgroundJobQueue {
  private queue: Job[] = []
  private processing = false
  private workers: Set<string> = new Set()

  async addJob(type: Job['type'], data: any, maxRetries = 3): Promise<string> {
    const job: Job = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      type,
      data,
      retries: 0,
      maxRetries,
      createdAt: new Date()
    }

    this.queue.push(job)
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue()
    }

    return job.id
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const job = this.queue.shift()!
      
      try {
        await this.processJob(job)
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error)
        
        if (job.retries < job.maxRetries) {
          job.retries++
          job.error = error instanceof Error ? error.message : 'Unknown error'
          this.queue.push(job) // Retry later
        } else {
          console.error(`Job ${job.id} failed after ${job.maxRetries} retries`)
          await this.logFailedJob(job, error)
        }
      }
    }

    this.processing = false
  }

  private async processJob(job: Job) {
    const workerId = `worker-${Date.now()}`
    this.workers.add(workerId)

    try {
      switch (job.type) {
        case 'summarization':
          await this.processSummarizationJob(job)
          break
        case 'embedding':
          await this.processEmbeddingJob(job)
          break
        default:
          throw new Error(`Unknown job type: ${job.type}`)
      }

      job.processedAt = new Date()
      await this.logSuccessfulJob(job)
    } finally {
      this.workers.delete(workerId)
    }
  }

  private async processSummarizationJob(job: Job) {
    const { ideaId, text } = job.data
    const startTime = Date.now()

    try {
      const result = await summarizeText(text, {
        overrides: {
          max_tokens: 30,
        },
      })
      const summary = result.data
      const duration = Date.now() - startTime

      // Update the idea with the summary
      const { createServerClient } = await import('@/lib/supabase')
      const supabase = createServerClient()
      
      const { error: updateError } = await supabase
        .from('ideas')
        .update({ 
          summary,
          state: 'ready',
          updated_at: new Date().toISOString()
        })
        .eq('id', ideaId)

      if (updateError) {
        throw new Error(`Failed to update idea: ${updateError.message}`)
      }

      // Log the AI operation
      await this.logAiOperation({
        type: 'summarization',
        ideaId,
        model: result.model.id,
        duration,
        success: true,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cost: result.usage.cost,
      })

    } catch (error) {
      // Update idea state to error if it fails
      const { createServerClient } = await import('@/lib/supabase')
      const supabase = createServerClient()
      
      await supabase
        .from('ideas')
        .update({ 
          state: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', ideaId)

      throw error
    }
  }

  private async processEmbeddingJob(job: Job) {
    const { ideaId, text } = job.data
    const startTime = Date.now()

    try {
      const result = await createEmbedding(text)
      const embedding = result.data
      const duration = Date.now() - startTime

      // Update the idea with the embedding
      const { createServerClient } = await import('@/lib/supabase')
      const supabase = createServerClient()
      
      const { error: updateError } = await supabase
        .from('ideas')
        .update({ 
          embedding: JSON.stringify(embedding),
          updated_at: new Date().toISOString()
        })
        .eq('id', ideaId)

      if (updateError) {
        throw new Error(`Failed to update idea: ${updateError.message}`)
      }

      // Log the AI operation
      await this.logAiOperation({
        type: 'embedding',
        ideaId,
        model: result.model.id,
        duration,
        success: true,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cost: result.usage.cost,
      })

    } catch (error) {
      throw error
    }
  }

  private async logAiOperation(operation: {
    type: string
    ideaId: string
    model: string
    duration: number
    success: boolean
    inputTokens?: number
    outputTokens?: number
    cost?: number
    error?: string
  }) {
    try {
      const { createServerClient } = await import('@/lib/supabase')
      const supabase = createServerClient()
      
      await supabase
        .from('ai_operations')
        .insert({
          type: operation.type,
          idea_id: operation.ideaId,
          model: operation.model,
          duration: operation.duration,
          success: operation.success,
          error: operation.error || null,
          input_tokens: operation.inputTokens || null,
          output_tokens: operation.outputTokens || null,
          cost: operation.cost || null
        })
    } catch (error) {
      console.error('Failed to log AI operation:', error)
      // Don't throw - logging failure shouldn't fail the job
    }
  }

  private async logSuccessfulJob(job: Job) {
    console.log(`✅ Job ${job.id} (${job.type}) completed successfully`)
  }

  private async logFailedJob(job: Job, error: any) {
    console.error(`❌ Job ${job.id} (${job.type}) failed permanently:`, error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    await this.logAiOperation({
      type: job.type,
      ideaId: job.data.ideaId,
      model: 'unknown',
      duration: 0,
      success: false,
      error: errorMessage
    })
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      activeWorkers: this.workers.size
    }
  }
}

// Singleton instance
const backgroundJobQueue = new BackgroundJobQueue()

export { backgroundJobQueue }
export type { Job }