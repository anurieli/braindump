import type { BrainDump, BrainDumpDB, IdeaDB, EdgeDB } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Transformation functions between frontend and database formats
export function brainDumpFromDB(db: BrainDumpDB, ideas: IdeaDB[], edges: EdgeDB[]): BrainDump {
  const ideasMap = new Map(
    ideas.map(idea => [
      idea.id,
      {
        id: idea.id,
        content: idea.content,
        x: idea.position_x,
        y: idea.position_y,
        width: idea.width,
        height: idea.height,
        summary: idea.summary,
        metadata: idea.metadata,
        createdAt: new Date(idea.created_at).getTime(),
        updatedAt: new Date(idea.updated_at).getTime(),
      }
    ])
  );

  return {
    id: db.id,
    name: db.name,
    ideas: ideasMap,
    edges: edges.map(edge => ({
      id: edge.id,
      sourceId: edge.parent_id,
      targetId: edge.child_id,
      relationshipType: edge.type,
      note: edge.note,
      createdAt: new Date(edge.created_at).getTime(),
    })),
    panX: db.viewport_x,
    panY: db.viewport_y,
    zoom: db.viewport_zoom,
    theme: db.theme,
    createdAt: new Date(db.created_at).getTime(),
    updatedAt: new Date(db.updated_at).getTime(),
  };
}

export function brainDumpToDB(brainDump: BrainDump) {
  return {
    id: brainDump.id,
    name: brainDump.name,
    viewport_x: brainDump.panX,
    viewport_y: brainDump.panY,
    viewport_zoom: brainDump.zoom,
    theme: brainDump.theme,
    ideas: Array.from(brainDump.ideas.entries()).map(([id, idea]) => ({
      id,
      text: idea.content,
      position_x: idea.x,
      position_y: idea.y,
      width: idea.width || 200,
      height: idea.height || 100,
      summary: idea.summary,
      metadata: idea.metadata || {},
    })),
    edges: brainDump.edges.map(edge => ({
      id: edge.id,
      parent_id: edge.sourceId,
      child_id: edge.targetId,
      type: edge.relationshipType,
      note: edge.note,
    })),
  };
}

// API functions
export async function loadBrainDumps(accessToken: string): Promise<Map<string, BrainDump>> {
  try {
    const response = await fetch(`${API_BASE_URL}/brain-dumps`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load brain dumps: ${response.statusText}`);
    }

    const responseData = await response.json();
    const brainDumpsMap = new Map<string, BrainDump>();

    // Handle the API response format {data: array}
    const brainDumpsArray = responseData.data || [];

    // For now, create minimal brain dumps since the API doesn't return full data
    // This will need to be updated when we have endpoints for fetching full brain dump data
    for (const brainDumpDB of brainDumpsArray) {
      const brainDump: BrainDump = {
        id: brainDumpDB.id,
        name: brainDumpDB.name,
        ideas: new Map(),
        edges: [],
        panX: brainDumpDB.viewport_x || 0,
        panY: brainDumpDB.viewport_y || 0,
        zoom: brainDumpDB.viewport_zoom || 1.0,
        theme: brainDumpDB.theme || 'light',
        createdAt: new Date(brainDumpDB.created_at).getTime(),
        updatedAt: new Date(brainDumpDB.updated_at).getTime(),
      };
      brainDumpsMap.set(brainDump.id, brainDump);
    }

    return brainDumpsMap;
  } catch (error) {
    console.error('Error loading brain dumps:', error);
    return new Map();
  }
}

export async function saveBrainDump(brainDump: BrainDump, accessToken: string): Promise<boolean> {
  try {
    const payload = brainDumpToDB(brainDump);

    const response = await fetch(`${API_BASE_URL}/brain-dumps`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to save brain dump: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error saving brain dump:', error);
    return false;
  }
}

export async function deleteBrainDumpAPI(id: string, accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/brain-dumps/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete brain dump: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting brain dump:', error);
    return false;
  }
}

// Debounced save function
let saveTimeout: NodeJS.Timeout | null = null;

export function debouncedSave(brainDump: BrainDump, accessToken: string, delay = 2000) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    saveBrainDump(brainDump, accessToken);
  }, delay);
}

