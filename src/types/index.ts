// Core types for Brain Dump Canvas

export interface BrainDump {
  id: string
  name: string
  created_at: string
  updated_at: string
  archived_at?: string
  viewport_x: number
  viewport_y: number
  viewport_zoom: number
}

export interface Idea {
  id: string
  brain_dump_id: string
  text: string
  summary?: string
  position_x: number
  position_y: number
  width: number
  height: number
  state: 'generating' | 'ready' | 'error'
  session_id?: string
  embedding?: number[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Edge {
  id: string
  brain_dump_id: string
  parent_id: string
  child_id: string
  type: string
  note?: string
  created_at: string
  updated_at: string
}

export interface EdgeType {
  id: string
  name: string
  is_default: boolean
  created_at: string
}

export interface Attachment {
  id: string
  idea_id: string
  type: 'image' | 'pdf' | 'url' | 'file' | 'text'
  url: string
  filename?: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export type Theme = 'light' | 'dark'
export type Modal = 'settings' | 'idea-details' | 'edge-creation' | null