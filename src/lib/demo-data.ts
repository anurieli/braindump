import type { BrainDump, Idea, Edge } from '@/types';

export function createWelcomeBrainDump(userId: string): BrainDump {
  const now = Date.now();
  const brainDumpId = `bd_welcome_${userId}_${now}`;
  
  // Create welcome ideas
  const ideas = new Map<string, Idea>();
  
  const welcomeIdea: Idea = {
    id: `idea_1_${now}`,
    content: '👋 Welcome to Brain Dump Canvas!\n\nThis is your infinite canvas for ideas. Double-click to edit, drag to move, and connect related thoughts.',
    x: 100,
    y: 100,
    width: 250,
    height: 150,
    createdAt: now,
    updatedAt: now,
  };
  
  const createIdea: Idea = {
    id: `idea_2_${now}`,
    content: '✨ Create Ideas\n\nType in the input box below and press Enter to add new ideas to your canvas.',
    x: 450,
    y: 80,
    width: 220,
    height: 130,
    createdAt: now,
    updatedAt: now,
  };
  
  const connectIdea: Idea = {
    id: `idea_3_${now}`,
    content: '🔗 Connect Ideas\n\nClick the connection handle (appears on hover) and drag to another idea to create relationships.',
    x: 450,
    y: 280,
    width: 220,
    height: 150,
    createdAt: now,
    updatedAt: now,
  };
  
  const organizeIdea: Idea = {
    id: `idea_4_${now}`,
    content: '📐 Organize\n\nDrag ideas around, use box selection (click and drag on canvas), and zoom with mouse wheel.',
    x: 100,
    y: 320,
    width: 220,
    height: 140,
    createdAt: now,
    updatedAt: now,
  };
  
  const themesIdea: Idea = {
    id: `idea_5_${now}`,
    content: '🎨 Themes\n\nClick the theme button in the toolbar to switch between 8 beautiful themes!',
    x: 750,
    y: 150,
    width: 200,
    height: 120,
    createdAt: now,
    updatedAt: now,
  };
  
  const shortcutsIdea: Idea = {
    id: `idea_6_${now}`,
    content: '⌨️ Keyboard Shortcuts\n\nPress ? to see all shortcuts\nDelete/Backspace to remove\nCmd/Ctrl+Z to undo',
    x: 750,
    y: 320,
    width: 200,
    height: 140,
    createdAt: now,
    updatedAt: now,
  };
  
  ideas.set(welcomeIdea.id, welcomeIdea);
  ideas.set(createIdea.id, createIdea);
  ideas.set(connectIdea.id, connectIdea);
  ideas.set(organizeIdea.id, organizeIdea);
  ideas.set(themesIdea.id, themesIdea);
  ideas.set(shortcutsIdea.id, shortcutsIdea);
  
  // Create edges
  const edges: Edge[] = [
    {
      id: `edge_1_${now}`,
      sourceId: welcomeIdea.id,
      targetId: createIdea.id,
      relationshipType: 'leads-to',
      createdAt: now,
    },
    {
      id: `edge_2_${now}`,
      sourceId: welcomeIdea.id,
      targetId: organizeIdea.id,
      relationshipType: 'relates-to',
      createdAt: now,
    },
    {
      id: `edge_3_${now}`,
      sourceId: createIdea.id,
      targetId: connectIdea.id,
      relationshipType: 'leads-to',
      createdAt: now,
    },
    {
      id: `edge_4_${now}`,
      sourceId: createIdea.id,
      targetId: themesIdea.id,
      relationshipType: 'relates-to',
      createdAt: now,
    },
    {
      id: `edge_5_${now}`,
      sourceId: connectIdea.id,
      targetId: shortcutsIdea.id,
      relationshipType: 'relates-to',
      createdAt: now,
    },
  ];
  
  return {
    id: brainDumpId,
    name: 'Welcome to Brain Dump Canvas',
    ideas,
    edges,
    panX: 0,
    panY: 0,
    zoom: 1,
    theme: 'light',
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyBrainDump(name: string = 'New Brain Dump'): BrainDump {
  const now = Date.now();
  
  return {
    id: `bd_${now}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    ideas: new Map(),
    edges: [],
    panX: 0,
    panY: 0,
    zoom: 1,
    theme: 'light',
    createdAt: now,
    updatedAt: now,
  };
}

type DemoIdeaTemplate = {
  key: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type DemoEdgeTemplate = {
  parentKey: string;
  childKey: string;
  type: string;
  note?: string;
};

export function getDemoSeedData() {
  const ideas: DemoIdeaTemplate[] = [
    {
      key: 'welcome',
      text: '👋 Welcome Demo\n\nDrag ideas, zoom around, and connect concepts to build your network of thoughts.',
      x: -220,
      y: -120,
      width: 260,
      height: 160,
    },
    {
      key: 'capture',
      text: '✍️ Capture\n\nUse the quick input at the bottom to add fresh ideas in seconds.',
      x: 100,
      y: -140,
      width: 240,
      height: 140,
    },
    {
      key: 'connect',
      text: '🔗 Connect\n\nHover an idea to reveal handles, then drag to another idea to create a relationship.',
      x: 360,
      y: 40,
      width: 260,
      height: 150,
    },
    {
      key: 'organize',
      text: '🧭 Organize\n\nShift + drag for box selection, or press space and drag to pan the canvas.',
      x: -260,
      y: 200,
      width: 260,
      height: 150,
    },
    {
      key: 'themes',
      text: '🎨 Themes\n\nOpen the toolbar to flip between gradients, dark mode, or dotted canvases.',
      x: 60,
      y: 220,
      width: 240,
      height: 140,
    },
    {
      key: 'shortcuts',
      text: '⌨️ Shortcuts\n\nPress ? to view the full shortcut list. Undo with Cmd/Ctrl + Z.',
      x: 360,
      y: 260,
      width: 240,
      height: 140,
    },
  ];

  const edges: DemoEdgeTemplate[] = [
    {
      parentKey: 'welcome',
      childKey: 'capture',
      type: 'inspired_by',
      note: 'Start here to jot down your thoughts',
    },
    {
      parentKey: 'capture',
      childKey: 'connect',
      type: 'prerequisite_for',
    },
    {
      parentKey: 'connect',
      childKey: 'organize',
      type: 'related_to',
    },
    {
      parentKey: 'organize',
      childKey: 'themes',
      type: 'related_to',
    },
    {
      parentKey: 'themes',
      childKey: 'shortcuts',
      type: 'depends_on',
    },
  ];

  return { ideas, edges };
}

