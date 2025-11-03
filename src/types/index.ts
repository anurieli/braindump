// Core types for Brain Dump Canvas

export type ThemeType = 
  | 'light'
  | 'gradient-purple'
  | 'gradient-ocean'
  | 'gradient-sunset'
  | 'gradient-forest'
  | 'dots-light'
  | 'dots-dark'
  | 'waves';

export interface User {
  id: string;
  email: string | null;
  name?: string;
}

export interface BrainDump {
  id: string;
  name: string;
  ideas: Map<string, Idea>;
  edges: Edge[];
  panX: number;
  panY: number;
  zoom: number;
  theme?: ThemeType;
  createdAt: number;
  updatedAt: number;
}

export interface Idea {
  id: string;
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  state?: 'generating' | 'ready' | 'error';
  summary?: string;
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
  createdAt?: number;
  updatedAt?: number;
}

export interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: string;
  note?: string;
  createdAt?: number;
}

export interface EdgeType {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface Attachment {
  id: string;
  ideaId: string;
  type: 'image' | 'pdf' | 'url' | 'file' | 'text';
  url: string;
  filename?: string;
  metadata?: Record<string, unknown>;
  createdAt?: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// Canvas interaction state
export interface BoxSelection {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  append: boolean;
}

export interface ConnectionState {
  sourceId: string;
  mouseX: number;
  mouseY: number;
}

// Legacy types for backward compatibility with database
export interface BrainDumpDB {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  viewport_x: number;
  viewport_y: number;
  viewport_zoom: number;
  theme?: ThemeType;
  idea_count?: number;
  edge_count?: number;
}

export interface IdeaDB {
  id: string;
  brain_dump_id: string;
  text: string;
  summary?: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  state: 'generating' | 'ready' | 'error';
  session_id?: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EdgeDB {
  id: string;
  brain_dump_id: string;
  parent_id: string;
  child_id: string;
  type: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export type Modal = 'settings' | 'idea-details' | 'edge-creation' | 'keyboard-shortcuts' | null;