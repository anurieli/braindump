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
const ALLOWED_TEXT_TYPES = [
  'text/plain',           // .txt
  'text/markdown',        // .md
  'application/json',     // .json
  'text/javascript',      // .js
  'application/javascript', // .js (alternative)
  'text/typescript',      // .ts (if served with correct MIME)
  'text/css',            // .css
  'text/html',           // .html
  'text/xml',            // .xml
  'application/xml',      // .xml (alternative)
  'text/csv',            // .csv
  'application/yaml',     // .yml, .yaml
  'text/yaml'            // .yml, .yaml (alternative)
]
const STORAGE_BUCKET = 'attachments'

// Text file extensions that browsers might serve with generic MIME types
const TEXT_EXTENSIONS = [
  '.txt', '.md', '.markdown', '.js', '.ts', '.tsx', '.jsx',
  '.css', '.html', '.htm', '.xml', '.json', '.csv', '.yml', 
  '.yaml', '.sql', '.py', '.rb', '.php', '.java', '.c', '.cpp',
  '.h', '.hpp', '.cs', '.go', '.rs', '.swift', '.kt', '.scala'
]

/**
 * Check if a file is a text file based on MIME type or extension
 */
function isTextFile(file: File): boolean {
  // Check MIME type first
  if (ALLOWED_TEXT_TYPES.includes(file.type)) {
    return true
  }
  
  // Fallback to extension for files with generic MIME types
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  return TEXT_EXTENSIONS.includes(extension)
}

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
  } else if (file.type === 'application/pdf') {
    return { valid: true, type: 'pdf' }
  } else if (isTextFile(file)) {
    return { valid: true, type: 'file' } // Text files are categorized as 'file'
  } else {
    return {
      valid: false,
      error: 'Unsupported file type. Supported: images (JPEG, PNG, WebP, GIF), PDFs, and text files.'
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
    const blobUrl = URL.createObjectURL(file)

    const cleanup = () => {
      URL.revokeObjectURL(blobUrl)
    }

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
      
      // Convert to base64 data URL instead of blob URL
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        cleanup()
        resolve(dataUrl)
      } catch (error) {
        cleanup()
        resolve(null)
      }
    }

    img.onerror = () => {
      cleanup()
      resolve(null)
    }
    
    img.src = blobUrl
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
    const blobUrl = URL.createObjectURL(file)
    
    const cleanup = () => {
      URL.revokeObjectURL(blobUrl)
    }
    
    img.onload = () => {
      cleanup()
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    
    img.onerror = () => {
      cleanup()
      resolve(null)
    }
    
    img.src = blobUrl
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
 * Generate a thumbnail for PDF files
 */
export async function generatePDFThumbnail(file: File, maxSize: number = 200): Promise<string | null> {
  if (file.type !== 'application/pdf') {
    console.log('📄 Not a PDF file, skipping thumbnail generation');
    return null
  }

  console.log('📄 Starting PDF thumbnail generation...');

  try {
    // Skip PDF thumbnail generation in server-side rendering
    if (typeof window === 'undefined') {
      console.log('📄 Server-side rendering detected, skipping thumbnail');
      return null
    }

    // Use pdf-lib to extract basic PDF information and create a representative thumbnail
    console.log('📄 Loading pdf-lib...');
    const { PDFDocument } = await import('pdf-lib')
    
    // Convert file to ArrayBuffer
    console.log('📄 Converting file to ArrayBuffer...');
    const arrayBuffer = await file.arrayBuffer()
    
    // Load PDF document to get metadata
    console.log('📄 Loading PDF document...');
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const pageCount = pdfDoc.getPageCount()
    console.log('📄 PDF loaded successfully. Pages:', pageCount);
    const firstPage = pdfDoc.getPage(0)
    const { width, height } = firstPage.getSize()
    console.log('📄 First page dimensions:', { width, height });

    // Create a representative canvas thumbnail
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) {
      return null
    }

    // Calculate dimensions for thumbnail
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

    // Create a stylized PDF thumbnail representation
    // Background
    const gradient = context.createLinearGradient(0, 0, thumbWidth, thumbHeight)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(1, '#f8f9fa')
    context.fillStyle = gradient
    context.fillRect(0, 0, thumbWidth, thumbHeight)

    // Border
    context.strokeStyle = '#e5e7eb'
    context.lineWidth = 2
    context.strokeRect(1, 1, thumbWidth - 2, thumbHeight - 2)

    // PDF icon representation - create lines to simulate document content
    const lineHeight = 8
    const lineSpacing = 4
    const startY = 20
    const marginX = 12
    const maxLineWidth = thumbWidth - (marginX * 2)

    context.strokeStyle = '#6b7280'
    context.lineWidth = 1

    // Draw representative text lines
    for (let i = 0; i < Math.floor((thumbHeight - 40) / (lineHeight + lineSpacing)); i++) {
      const y = startY + i * (lineHeight + lineSpacing)
      const lineWidth = Math.random() * (maxLineWidth * 0.4) + (maxLineWidth * 0.6)
      
      context.beginPath()
      context.moveTo(marginX, y)
      context.lineTo(marginX + lineWidth, y)
      context.stroke()
    }

    // Add PDF indicator
    context.fillStyle = '#dc2626'
    context.font = 'bold 10px sans-serif'
    context.textAlign = 'center'
    context.fillText('PDF', thumbWidth / 2, thumbHeight - 8)

    // Add page count if multiple pages
    if (pageCount > 1) {
      context.fillStyle = '#374151'
      context.font = '8px sans-serif'
      context.textAlign = 'right'
      context.fillText(`${pageCount} pages`, thumbWidth - 5, 12)
    }

    const result = canvas.toDataURL('image/png', 0.9)
    console.log('📄 PDF thumbnail generated successfully, size:', result.length, 'chars');
    return result
  } catch (error) {
    console.error('📄 Failed to generate PDF thumbnail:', error)
    return null
  }
}

/**
 * Extract text content from text files for preview
 */
export async function extractTextContent(file: File, maxLength: number = 500): Promise<string | null> {
  // Only process text files
  if (!isTextFile(file)) {
    return null
  }

  // Don't extract content from files larger than 1MB for performance
  const MAX_TEXT_FILE_SIZE = 1024 * 1024 // 1MB
  if (file.size > MAX_TEXT_FILE_SIZE) {
    return null
  }

  try {
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(file, 'utf-8')
    })

    // Truncate to maxLength and ensure it ends at a word boundary
    if (text.length <= maxLength) {
      return text
    }

    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    const lastNewline = truncated.lastIndexOf('\n')
    
    // Use the later of the two to avoid cutting mid-word
    const cutPoint = Math.max(lastSpace, lastNewline)
    
    if (cutPoint > 0 && cutPoint > maxLength * 0.8) {
      return truncated.substring(0, cutPoint) + '...'
    }

    return truncated + '...'
  } catch (error) {
    console.warn('Failed to extract text content:', error)
    return null
  }
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

      // Add type-specific metadata
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
      } else if (validation.type === 'pdf') {
        // Generate PDF thumbnail and extract metadata
        console.log('📄 Generating PDF thumbnail for:', file.name);
        const pdfThumbnail = await generatePDFThumbnail(file)
        console.log('📄 PDF thumbnail result:', pdfThumbnail ? 'Generated successfully' : 'Failed to generate');
        if (pdfThumbnail) {
          metadata.thumbnailUrl = pdfThumbnail
          console.log('📄 PDF thumbnail URL saved to metadata');
        }
        
        // Extract PDF page count
        try {
          const { PDFDocument } = await import('pdf-lib')
          const arrayBuffer = await file.arrayBuffer()
          const pdfDoc = await PDFDocument.load(arrayBuffer)
          metadata.pageCount = pdfDoc.getPageCount()
        } catch (error) {
          console.warn('Failed to extract PDF page count:', error)
        }
      } else if (isTextFile(file)) {
        // Extract text content for preview
        const textContent = await extractTextContent(file)
        if (textContent) {
          metadata.textContent = textContent
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
    const { error } = await supabase.storage
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

    // Add type-specific metadata
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
    } else if (validation.type === 'pdf') {
      // Generate PDF thumbnail and extract metadata
      const pdfThumbnail = await generatePDFThumbnail(file)
      if (pdfThumbnail) {
        metadata.thumbnailUrl = pdfThumbnail
      }
      
      // Extract PDF page count
      try {
        const { PDFDocument } = await import('pdf-lib')
        const arrayBuffer = await file.arrayBuffer()
        const pdfDoc = await PDFDocument.load(arrayBuffer)
        metadata.pageCount = pdfDoc.getPageCount()
      } catch (error) {
        console.warn('Failed to extract PDF page count:', error)
      }
    } else if (isTextFile(file)) {
      // Extract text content for preview
      const textContent = await extractTextContent(file)
      if (textContent) {
        metadata.textContent = textContent
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
    } else if (validation.type === 'pdf') {
      // Generate PDF thumbnail and extract metadata
      const pdfThumbnail = await generatePDFThumbnail(file)
      if (pdfThumbnail) {
        metadata.thumbnailUrl = pdfThumbnail
      }
      
      // Extract PDF page count
      try {
        const { PDFDocument } = await import('pdf-lib')
        const arrayBuffer = await file.arrayBuffer()
        const pdfDoc = await PDFDocument.load(arrayBuffer)
        metadata.pageCount = pdfDoc.getPageCount()
      } catch (error) {
        console.warn('Failed to extract PDF page count:', error)
      }
    } else if (isTextFile(file)) {
      // Extract text content for preview
      const textContent = await extractTextContent(file)
      if (textContent) {
        metadata.textContent = textContent
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
 * Get file type category for rendering
 */
export function getFileTypeCategory(mimeType: string, filename?: string, attachmentType?: string): 'image' | 'pdf' | 'text' | 'url' | 'document' | 'unknown' {
  // Check attachment type first (for URL attachments)
  if (attachmentType === 'url') {
    return 'url'
  }
  if (mimeType.startsWith('image/')) {
    return 'image'
  } else if (mimeType === 'application/pdf') {
    return 'pdf'
  } else if (ALLOWED_TEXT_TYPES.includes(mimeType)) {
    return 'text'
  } else if (filename && isTextFileByExtension(filename)) {
    return 'text'
  } else if (mimeType.startsWith('text/') || mimeType.includes('document')) {
    return 'document'
  } else {
    return 'unknown'
  }
}

/**
 * Check if a file is a text file based on extension only
 */
function isTextFileByExtension(filename: string): boolean {
  const extension = '.' + filename.split('.').pop()?.toLowerCase()
  return TEXT_EXTENSIONS.includes(extension)
}