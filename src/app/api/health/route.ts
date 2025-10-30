import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { backgroundJobQueue } from '@/lib/background-jobs'
import { HealthCheckError, formatErrorResponse } from '@/lib/errors'

// GET /api/health - System health check
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    const checks: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      checks: {}
    }

    // Database health check
    try {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from('brain_dumps')
        .select('count(*)')
        .limit(1)

      if (error) {
        throw new HealthCheckError('database', error)
      }

      checks.checks.database = {
        status: 'healthy',
        response_time: Date.now() - startTime
      }
    } catch (error) {
      checks.checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      checks.status = 'degraded'
    }

    // Background job queue health check
    try {
      const queueStatus = backgroundJobQueue.getQueueStatus()
      checks.checks.background_jobs = {
        status: queueStatus.queueLength > 1000 ? 'degraded' : 'healthy',
        queue_length: queueStatus.queueLength,
        processing: queueStatus.processing,
        active_workers: queueStatus.activeWorkers
      }

      if (queueStatus.queueLength > 1000) {
        checks.status = 'degraded'
      }
    } catch (error) {
      checks.checks.background_jobs = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      checks.status = 'degraded'
    }

    // OpenAI API health check (optional, can be slow)
    const checkExternalServices = request.nextUrl.searchParams.get('external') === 'true'
    if (checkExternalServices) {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })

        checks.checks.openai = {
          status: response.ok ? 'healthy' : 'unhealthy',
          response_time: Date.now() - startTime,
          status_code: response.status
        }

        if (!response.ok) {
          checks.status = 'degraded'
        }
      } catch (error) {
        checks.checks.openai = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
        checks.status = 'degraded'
      }
    }

    // Memory usage check
    const memoryUsage = process.memoryUsage()
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    }

    checks.checks.memory = {
      status: memoryUsageMB.heapUsed > 500 ? 'degraded' : 'healthy', // Alert if > 500MB
      usage_mb: memoryUsageMB
    }

    if (memoryUsageMB.heapUsed > 500) {
      checks.status = 'degraded'
    }

    // Environment check
    checks.checks.environment = {
      status: 'healthy',
      node_version: process.version,
      platform: process.platform,
      openai_configured: !!process.env.OPENAI_API_KEY,
      supabase_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL
    }

    // Overall response time
    checks.response_time = Date.now() - startTime

    // Determine HTTP status code based on health
    const statusCode = checks.status === 'healthy' ? 200 : 
                     checks.status === 'degraded' ? 200 : 503

    return NextResponse.json(checks, { status: statusCode })

  } catch (error) {
    console.error('Health check failed:', error)
    
    const errorResponse = formatErrorResponse(error as Error)
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      ...errorResponse
    }, { status: 503 })
  }
}