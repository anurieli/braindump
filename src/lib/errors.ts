// Custom error classes for better error handling

export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean
  public details?: any

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    this.details = details

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(message, 429, details)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 500, details)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string, details?: any) {
    super(message || `${service} service unavailable`, 503, details)
  }
}

// Error code mappings for different database errors
export const DATABASE_ERROR_CODES = {
  '23505': 'Unique constraint violation', // Duplicate key
  '23503': 'Foreign key constraint violation',
  '23502': 'Not null constraint violation',
  '23514': 'Check constraint violation',
  'PGRST116': 'Resource not found',
  'PGRST103': 'Insufficient privileges'
} as const

// Handle Supabase/PostgreSQL errors
export function handleDatabaseError(error: any): AppError {
  const code = error.code || error.error_code
  const message = error.message || error.error_description || 'Database error'
  const details = error.details || error.hint

  switch (code) {
    case '23505':
      return new ConflictError('Resource already exists', { originalError: message, details })
    
    case 'PGRST116':
      return new NotFoundError()
    
    case '23503':
      return new ValidationError('Referenced resource does not exist', { originalError: message, details })
    
    case '23502':
      return new ValidationError('Required field is missing', { originalError: message, details })
    
    case '23514':
      return new ValidationError('Invalid data format', { originalError: message, details })
    
    case 'PGRST103':
      return new UnauthorizedError('Insufficient permissions')
    
    default:
      return new DatabaseError('Database operation failed', { 
        code, 
        originalError: message, 
        details 
      })
  }
}

// Handle external API errors (OpenAI, etc.)
export function handleExternalApiError(serviceName: string, error: any): AppError {
  const status = error.status || error.response?.status
  const message = error.message || error.response?.data?.error?.message || 'External service error'

  switch (status) {
    case 400:
      return new ValidationError(`${serviceName} request invalid`, { originalError: message })
    
    case 401:
      return new UnauthorizedError(`${serviceName} authentication failed`)
    
    case 403:
      return new ForbiddenError(`${serviceName} access denied`)
    
    case 429:
      return new RateLimitError(`${serviceName} rate limit exceeded`, { originalError: message })
    
    case 500:
    case 502:
    case 503:
    case 504:
      return new ExternalServiceError(serviceName, message)
    
    default:
      return new ExternalServiceError(serviceName, message, { status, originalError: message })
  }
}

// Error response formatter
export function formatErrorResponse(error: AppError | Error) {
  if (error instanceof AppError) {
    return {
      error: error.message,
      statusCode: error.statusCode,
      details: error.details,
      timestamp: new Date().toISOString()
    }
  }

  // Handle unknown errors
  console.error('Unexpected error:', error)
  return {
    error: 'Internal server error',
    statusCode: 500,
    timestamp: new Date().toISOString()
  }
}

// Async error handler wrapper
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next?: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      if (next) {
        next(error)
      } else {
        throw error
      }
    })
  }
}

// Error logging utility
export function logError(error: Error | AppError, context?: any) {
  const timestamp = new Date().toISOString()
  const errorInfo = {
    timestamp,
    message: error.message,
    stack: error.stack,
    context
  }

  if (error instanceof AppError) {
    errorInfo.statusCode = error.statusCode
    errorInfo.details = error.details
  }

  // In production, you might want to send this to a logging service
  console.error('🚨 Error logged:', JSON.stringify(errorInfo, null, 2))
}

// Health check errors
export class HealthCheckError extends AppError {
  constructor(service: string, details?: any) {
    super(`Health check failed for ${service}`, 503, details)
  }
}