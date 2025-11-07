import { supabase } from './supabase'
import type { AttachmentMetadata } from '@/types'

export interface FileUploadResult {
  url: string
  filename: string
  metadata: AttachmentMetadata
}

export interface FileValidationResult {
  valid: boolean
  error?: string
  type?: 'image' | 'pdf' | 'file'
}

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain']
const STORAGE_BUCKET = 'attachments'

/**
 * Validate a file before upload
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`
    }
  }

  // Check file type
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: true, type: 'image' }
  } else if (ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return { valid: true, type: file.type === 'application/pdf' ? 'pdf' : 'file' }
  } else {
    return {
      valid: false,
      error: 'Unsupported file type. Only images (JPEG, PNG, WebP, GIF) and PDFs are allowed.'
    }
  }
}

/**
 * Generate a thumbnail for image files
 */
export async function generateThumbnail(file: File, maxSize: number = 200): Promise<string | null> {
  if (!file.type.startsWith('image/')) {
    return null
  }

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate thumbnail dimensions
      const { width, height } = img
      const aspectRatio = width / height
      
      let thumbWidth = maxSize
      let thumbHeight = maxSize
      
      if (aspectRatio > 1) {
        thumbHeight = maxSize / aspectRatio
      } else {
        thumbWidth = maxSize * aspectRatio
      }

      canvas.width = thumbWidth
      canvas.height = thumbHeight

      // Draw thumbnail
      ctx?.drawImage(img, 0, 0, thumbWidth, thumbHeight)
      
      // Convert to blob and create URL
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob))
        } else {
          resolve(null)
        }
      }, 'image/jpeg', 0.8)
    }

    img.onerror = () => resolve(null)
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith('image/')) {
    return null
  }

  return new Promise((resolve) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    
    img.onerror = () => resolve(null)
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Convert file to base64 data URL
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a file to Supabase Storage (with base64 fallback)
 */
export async function uploadFile(file: File): Promise<FileUploadResult> {
  // Validate file
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // For small files (< 1MB), use base64 encoding as fallback
  if (file.size < 1024 * 1024) {
    try {
      const base64Url = await fileToBase64(file);
      
      // Prepare metadata
      const metadata: AttachmentMetadata = {
        fileSize: file.size,
        mimeType: file.type,
        isBase64: true
      }

      // Add image-specific metadata
      if (validation.type === 'image') {
        const dimensions = await getImageDimensions(file)
        if (dimensions) {
          metadata.width = dimensions.width
          metadata.height = dimensions.height
        }

        // Generate thumbnail for larger images
        if (file.size > 100 * 1024) {
          const thumbnailUrl = await generateThumbnail(file)
          if (thumbnailUrl) {
            metadata.thumbnailUrl = thumbnailUrl
          }
        }
      }

      return {
        url: base64Url,
        filename: file.name,
        metadata
      }
    } catch (error) {
      console.error('Base64 encoding failed:', error);
      throw new Error('Failed to process file');
    }
  }

  // For larger files, try Supabase Storage (will fail until policies are fixed)
  try {
    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const filename = `${timestamp}_${randomString}.${fileExtension}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename)

    // Prepare metadata
    const metadata: AttachmentMetadata = {
      fileSize: file.size,
      mimeType: file.type
    }

    // Add image-specific metadata
    if (validation.type === 'image') {
      const dimensions = await getImageDimensions(file)
      if (dimensions) {
        metadata.width = dimensions.width
        metadata.height = dimensions.height
      }

      // Generate thumbnail for large images
      if (file.size > 100 * 1024) {
        const thumbnailUrl = await generateThumbnail(file)
        if (thumbnailUrl) {
          metadata.thumbnailUrl = thumbnailUrl
        }
      }
    }

    return {
      url: urlData.publicUrl,
      filename: file.name,
      metadata
    }
  } catch (storageError) {
    // Fallback to base64 for all files if storage fails
    console.warn('Storage upload failed, using base64 fallback:', storageError);
    
    const base64Url = await fileToBase64(file);
    
    const metadata: AttachmentMetadata = {
      fileSize: file.size,
      mimeType: file.type,
      isBase64: true
    }

    if (validation.type === 'image') {
      const dimensions = await getImageDimensions(file)
      if (dimensions) {
        metadata.width = dimensions.width
        metadata.height = dimensions.height
      }
    }

    return {
      url: base64Url,
      filename: file.name,
      metadata
    }
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(url: string): Promise<void> {
  // Extract filename from URL
  const filename = url.split('/').pop()
  if (!filename) {
    throw new Error('Invalid file URL')
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filename])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}

/**
 * Get file type category for icon rendering
 */
export function getFileTypeCategory(mimeType: string): 'image' | 'pdf' | 'document' | 'unknown' {
  if (mimeType.startsWith('image/')) {
    return 'image'
  } else if (mimeType === 'application/pdf') {
    return 'pdf'
  } else if (mimeType.startsWith('text/') || mimeType.includes('document')) {
    return 'document'
  } else {
    return 'unknown'
  }
}