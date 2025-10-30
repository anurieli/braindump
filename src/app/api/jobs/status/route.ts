import { NextRequest, NextResponse } from 'next/server'
import { backgroundJobQueue } from '@/lib/background-jobs'

// GET /api/jobs/status - Get background job queue status
export async function GET(request: NextRequest) {
  try {
    const status = backgroundJobQueue.getQueueStatus()
    
    return NextResponse.json({
      data: status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching job status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}