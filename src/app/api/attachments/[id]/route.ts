import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// DELETE /api/attachments/[id] - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidUUID(params.id)) {
      return NextResponse.json(
        { error: 'Invalid attachment ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // First get the attachment to retrieve storage path if it exists
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !attachment) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Attachment not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching attachment:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch attachment' },
        { status: 500 }
      )
    }

    // Delete the attachment record from database
    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting attachment record:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete attachment' },
        { status: 500 }
      )
    }

    // If this was a file attachment (not URL), delete from storage
    if (attachment.metadata?.storagePath && attachment.type !== 'url') {
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([attachment.metadata.storagePath])

      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
        // Don't fail the entire operation - the database record is already deleted
        // This is logged for monitoring but shouldn't block the user
      }
    }

    return NextResponse.json({
      data: {
        id: attachment.id,
        filename: attachment.filename,
        type: attachment.type
      },
      message: 'Attachment deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting attachment:', error)
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    )
  }
}