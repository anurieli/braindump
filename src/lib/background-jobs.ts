interface Job {
  id: string
  type: 'summarization' | 'embedding' | 'grammar'
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
        case 'grammar':
          await this.processGrammarJob(job)
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a summarization assistant. Summarize the following idea in 50 characters or less (max 2 lines). Maintain the core meaning. Do not add interpretation. Output only the summary, no explanation.'
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: 30,
          temperature: 0.3
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      const summary = result.choices[0].message.content.trim()
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
        model: 'gpt-4',
        duration,
        success: true,
        inputTokens: result.usage?.prompt_tokens,
        outputTokens: result.usage?.completion_tokens,
        cost: this.calculateCost('gpt-4', result.usage?.prompt_tokens || 0, result.usage?.completion_tokens || 0)
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
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
          dimensions: 1536
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      const embedding = result.data[0].embedding
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
        model: 'text-embedding-3-small',
        duration,
        success: true,
        inputTokens: result.usage?.prompt_tokens,
        outputTokens: 0, // Embeddings don't have output tokens
        cost: this.calculateCost('text-embedding-3-small', result.usage?.prompt_tokens || 0, 0)
      })

    } catch (error) {
      throw error
    }
  }

  private async processGrammarJob(job: Job) {
    const { ideaId, text } = job.data
    
    // Simple grammar cleaning - can be enhanced with LanguageTool API
    const cleanedText = text
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Proper spacing after sentences
      .trim()

    // Update the idea with cleaned text
    const { createServerClient } = await import('@/lib/supabase')
    const supabase = createServerClient()
    
    const { error: updateError } = await supabase
      .from('ideas')
      .update({ 
        text: cleanedText,
        updated_at: new Date().toISOString()
      })
      .eq('id', ideaId)

    if (updateError) {
      throw new Error(`Failed to update idea: ${updateError.message}`)
    }

    // Log the AI operation
    await this.logAiOperation({
      type: 'grammar',
      ideaId,
      model: 'rule-based',
      duration: 10, // Very fast
      success: true,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0
    })
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

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Pricing as of October 2024 (approximate)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.00003, output: 0.00006 }, // per token
      'text-embedding-3-small': { input: 0.00000002, output: 0 } // per token
    }

    const modelPricing = pricing[model]
    if (!modelPricing) return 0

    return (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output)
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