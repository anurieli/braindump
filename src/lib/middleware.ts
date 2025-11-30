import { NextRequest, NextResponse } from 'next/server'

// Types for validation schemas
export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'uuid' | 'email' | 'url' | 'array' | 'object'
    required?: boolean
    min?: number
    max?: number
    pattern?: RegExp
    enum?: any[]
    items?: ValidationSchema[string] // For array validation
    properties?: ValidationSchema // For object validation
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  data?: any
}

// UUID validation helper
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// URL validation helper
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Main validation function
export function validateData(data: any, schema: ValidationSchema): ValidationResult {
  const errors: string[] = []
  const validatedData: any = {}

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`)
      continue
    }

    // Skip validation for optional undefined/null fields
    if (!rules.required && (value === undefined || value === null)) {
      continue
    }

    // Type validation
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${field} must be a string`)
          break
        }
        if (rules.min !== undefined && value.length < rules.min) {
          errors.push(`${field} must be at least ${rules.min} characters`)
        }
        if (rules.max !== undefined && value.length > rules.max) {
          errors.push(`${field} must be at most ${rules.max} characters`)
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} format is invalid`)
        }
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`)
        }
        validatedData[field] = value.trim()
        break

      case 'number':
        const numValue = typeof value === 'string' ? parseFloat(value) : value
        if (typeof numValue !== 'number' || isNaN(numValue)) {
          errors.push(`${field} must be a number`)
          break
        }
        if (rules.min !== undefined && numValue < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`)
        }
        if (rules.max !== undefined && numValue > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`)
        }
        validatedData[field] = numValue
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${field} must be a boolean`)
          break
        }
        validatedData[field] = value
        break

      case 'uuid':
        if (typeof value !== 'string' || !isValidUUID(value)) {
          errors.push(`${field} must be a valid UUID`)
          break
        }
        validatedData[field] = value
        break

      case 'email':
        if (typeof value !== 'string' || !isValidEmail(value)) {
          errors.push(`${field} must be a valid email address`)
          break
        }
        validatedData[field] = value.toLowerCase()
        break

      case 'url':
        if (typeof value !== 'string' || !isValidUrl(value)) {
          errors.push(`${field} must be a valid URL`)
          break
        }
        validatedData[field] = value
        break

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${field} must be an array`)
          break
        }
        if (rules.min !== undefined && value.length < rules.min) {
          errors.push(`${field} must have at least ${rules.min} items`)
        }
        if (rules.max !== undefined && value.length > rules.max) {
          errors.push(`${field} must have at most ${rules.max} items`)
        }
        
        // Validate array items if schema provided
        if (rules.items) {
          const validatedItems = []
          for (let i = 0; i < value.length; i++) {
            const itemResult = validateData({ item: value[i] }, { item: rules.items })
            if (!itemResult.isValid) {
              errors.push(`${field}[${i}]: ${itemResult.errors.join(', ')}`)
            } else {
              validatedItems.push(itemResult.data?.item)
            }
          }
          validatedData[field] = validatedItems
        } else {
          validatedData[field] = value
        }
        break

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`${field} must be an object`)
          break
        }
        
        // Validate object properties if schema provided
        if (rules.properties) {
          const objectResult = validateData(value, rules.properties)
          if (!objectResult.isValid) {
            errors.push(`${field}: ${objectResult.errors.join(', ')}`)
          } else {
            validatedData[field] = objectResult.data
          }
        } else {
          validatedData[field] = value
        }
        break

      default:
        errors.push(`Unknown validation type for ${field}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? validatedData : undefined
  }
}

// Error response helper
export function createErrorResponse(message: string, status: number = 400, details?: any) {
  return NextResponse.json(
    {
      error: message,
      details,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

// Success response helper
export function createSuccessResponse(data: any, message?: string, status: number = 200) {
  return NextResponse.json(
    {
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

// Rate limiting (simple in-memory implementation)
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart)
    
    // Check if under limit
    if (validRequests.length >= this.maxRequests) {
      this.requests.set(identifier, validRequests)
      return false
    }

    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    return true
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now()
    const windowStart = now - this.windowMs
    const requests = this.requests.get(identifier) || []
    const validRequests = requests.filter(time => time > windowStart)
    return Math.max(0, this.maxRequests - validRequests.length)
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter(60000, 100) // 100 requests per minute

// Rate limiting middleware
export function withRateLimit(handler: Function, limiter: RateLimiter = globalRateLimiter) {
  return async (request: NextRequest, context?: any) => {
    // Use IP address as identifier (in production, consider user authentication)
    const identifier = request.ip || request.headers.get('x-forwarded-for') || 'anonymous'
    
    if (!limiter.isAllowed(identifier)) {
      return createErrorResponse(
        'Rate limit exceeded. Please try again later.',
        429,
        {
          remainingRequests: limiter.getRemainingRequests(identifier),
          windowMs: 60000
        }
      )
    }

    return handler(request, context)
  }
}

// Validation middleware
export function withValidation(schema: ValidationSchema, handler: Function) {
  return async (request: NextRequest, context?: any) => {
    try {
      let data: any = {}

      if (request.method === 'GET') {
        // Validate query parameters
        const url = new URL(request.url)
        for (const [key, value] of Array.from(url.searchParams.entries())) {
          data[key] = value
        }
      } else if (request.headers.get('content-type')?.includes('application/json')) {
        // Validate JSON body
        data = await request.json()
      } else if (request.headers.get('content-type')?.includes('multipart/form-data')) {
        // Validate form data
        const formData = await request.formData()
        for (const [key, value] of Array.from(formData.entries())) {
          data[key] = value
        }
      }

      const result = validateData(data, schema)
      
      if (!result.isValid) {
        return createErrorResponse(
          'Validation failed',
          400,
          { errors: result.errors }
        )
      }

      // Add validated data to request context
      const enhancedRequest = request as NextRequest & { validatedData: any }
      enhancedRequest.validatedData = result.data

      return handler(enhancedRequest, context)
    } catch (error) {
      console.error('Validation middleware error:', error)
      return createErrorResponse('Invalid request format', 400)
    }
  }
}

// Error handling middleware
export function withErrorHandling(handler: Function) {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('API Error:', error)
      
      // Different error types
      if (error instanceof SyntaxError) {
        return createErrorResponse('Invalid JSON format', 400)
      }
      
      if (error instanceof TypeError) {
        return createErrorResponse('Invalid data type', 400)
      }

      // Generic server error
      return createErrorResponse('Internal server error', 500)
    }
  }
}

// Logging middleware
export function withLogging(handler: Function) {
  return async (request: NextRequest, context?: any) => {
    const start = Date.now()
    const method = request.method
    const url = new URL(request.url)
    const path = url.pathname
    
    console.log(`🚀 ${method} ${path} - Start`)
    
    try {
      const response = await handler(request, context)
      const duration = Date.now() - start
      const status = response.status
      
      console.log(`✅ ${method} ${path} - ${status} (${duration}ms)`)
      
      return response
    } catch (error) {
      const duration = Date.now() - start
      console.error(`❌ ${method} ${path} - Error (${duration}ms):`, error)
      throw error
    }
  }
}

// Compose middleware
export function compose(...middlewares: Function[]) {
  return (handler: Function) => {
    return middlewares.reduceRight((acc, middleware) => {
      return middleware(acc)
    }, handler)
  }
}