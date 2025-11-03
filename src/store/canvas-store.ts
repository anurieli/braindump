import { create } from 'zustand';
import type { 
  BrainDump, 
  Idea, 
  Edge, 
  User, 
  ThemeType, 
  BoxSelection, 
  ConnectionState 
} from '@/types';

interface CanvasState {
  // Auth
  currentUser: User | null;
  accessToken: string | null;
  
  // Brain Dumps
  brainDumps: Map<string, BrainDump>;
  currentBrainDumpId: string | null;
  
  // Canvas State
  panX: number;
  panY: number;
  zoom: number;
  theme: ThemeType;
  showGrid: boolean;
  
  // Selection
  selectedIds: Set<string>;
  selectedEdgeIds: Set<string>;
  
  // Interaction State
  isDragging: boolean;
  isPanning: boolean;
  isCreatingConnection: boolean;
  connectionSourceId: string | null;
  connectionState: ConnectionState | null;
  hoveredNodeId: string | null;
  touchedNodesInConnection: Set<string>;
  boxSelection: BoxSelection | null;
  
  // Modal State
  detailModalOpen: boolean;
  detailModalIdeaId: string | null;
  settingsModalOpen: boolean;
  keyboardShortcutsModalOpen: boolean;
  
  // UI State
  sidePanelWidth: number;
  sidePanelCollapsed: boolean;
  
  // Undo/Redo
  history: BrainDump[];
  historyIndex: number;
  
  // Actions - Auth
  setCurrentUser: (user: User | null, token: string | null) => void;
  logout: () => void;
  
  // Actions - Brain Dumps
  setBrainDumps: (brainDumps: Map<string, BrainDump>) => void;
  setCurrentBrainDump: (id: string) => void;
  createBrainDump: (name: string) => string;
  renameBrainDump: (id: string, name: string) => void;
  deleteBrainDump: (id: string) => void;
  updateBrainDump: (id: string, updates: Partial<BrainDump>) => void;
  
  // Actions - Ideas
  addIdea: (idea: Idea) => void;
  updateIdea: (id: string, updates: Partial<Idea>) => void;
  deleteIdea: (id: string) => void;
  deleteSelectedIdeas: () => void;
  moveIdea: (id: string, x: number, y: number) => void;
  
  // Actions - Edges
  addEdge: (edge: Edge) => void;
  deleteEdge: (id: string) => void;
  deleteSelectedEdges: () => void;
  
  // Actions - Selection
  selectIdea: (id: string, multi?: boolean) => void;
  selectEdge: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  selectMultiple: (ids: string[]) => void;
  
  // Actions - Canvas
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  setTheme: (theme: ThemeType) => void;
  toggleGrid: () => void;
  resetViewport: () => void;
  
  // Actions - Interaction
  startConnection: (sourceId: string) => void;
  updateConnectionState: (mouseX: number, mouseY: number) => void;
  endConnection: (targetId?: string) => void;
  cancelConnection: () => void;
  setHoveredNodeId: (id: string | null) => void;
  addTouchedNodeInConnection: (id: string) => void;
  clearTouchedNodesInConnection: () => void;
  startBoxSelection: (x: number, y: number, append?: boolean) => void;
  updateBoxSelection: (x: number, y: number) => void;
  endBoxSelection: () => void;
  
  // Actions - Modals
  openDetailModal: (ideaId: string) => void;
  closeDetailModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  toggleKeyboardShortcuts: () => void;
  
  // Actions - UI
  setSidePanelWidth: (width: number) => void;
  toggleSidePanelCollapsed: () => void;
  
  // Actions - Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: () => void;
  
  // Helpers
  getCurrentBrainDump: () => BrainDump | null;
  getIdea: (id: string) => Idea | null;
  getSelectedIdeas: () => Idea[];
}

export const useStore = create<CanvasState>((set, get) => ({
  // Initial State
  currentUser: null,
  accessToken: null,
  brainDumps: new Map(),
  currentBrainDumpId: null,
  panX: 0,
  panY: 0,
  zoom: 1,
  theme: 'light',
  showGrid: true,
  selectedIds: new Set(),
  selectedEdgeIds: new Set(),
  isDragging: false,
  isPanning: false,
  isCreatingConnection: false,
  connectionSourceId: null,
  connectionState: null,
  hoveredNodeId: null,
  touchedNodesInConnection: new Set(),
  boxSelection: null,
  detailModalOpen: false,
  detailModalIdeaId: null,
  settingsModalOpen: false,
  keyboardShortcutsModalOpen: false,
  sidePanelWidth: 280,
  sidePanelCollapsed: false,
  history: [],
  historyIndex: -1,
  
  // Auth Actions
  setCurrentUser: (user, token) => {
    set({ currentUser: user, accessToken: token });
  },
  
  logout: () => {
    set({
      currentUser: null,
      accessToken: null,
      brainDumps: new Map(),
      currentBrainDumpId: null,
      selectedIds: new Set(),
      selectedEdgeIds: new Set(),
    });
  },
  
  // Brain Dump Actions
  setBrainDumps: (brainDumps) => {
    set({ brainDumps });
    // Set first brain dump as current if none selected
    if (!get().currentBrainDumpId && brainDumps.size > 0) {
      const firstId = Array.from(brainDumps.keys())[0];
      set({ currentBrainDumpId: firstId });
    }
  },
  
  setCurrentBrainDump: (id) => {
    const brainDump = get().brainDumps.get(id);
    if (brainDump) {
      set({
        currentBrainDumpId: id,
        panX: brainDump.panX,
        panY: brainDump.panY,
        zoom: brainDump.zoom,
        theme: brainDump.theme || 'light',
        selectedIds: new Set(),
        selectedEdgeIds: new Set(),
      });
    }
  },
  
  createBrainDump: (name) => {
    const id = `bd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newBrainDump: BrainDump = {
      id,
      name,
      ideas: new Map(),
      edges: [],
      panX: 0,
      panY: 0,
      zoom: 1,
      theme: get().theme,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const brainDumps = new Map(get().brainDumps);
    brainDumps.set(id, newBrainDump);
    set({ brainDumps, currentBrainDumpId: id });
    return id;
  },
  
  renameBrainDump: (id, name) => {
    const brainDumps = new Map(get().brainDumps);
    const brainDump = brainDumps.get(id);
    if (brainDump) {
      brainDumps.set(id, { ...brainDump, name, updatedAt: Date.now() });
      set({ brainDumps });
    }
  },
  
  deleteBrainDump: (id) => {
    const brainDumps = new Map(get().brainDumps);
    brainDumps.delete(id);
    
    let newCurrentId = get().currentBrainDumpId;
    if (newCurrentId === id) {
      newCurrentId = brainDumps.size > 0 ? Array.from(brainDumps.keys())[0] : null;
    }
    
    set({ brainDumps, currentBrainDumpId: newCurrentId });
  },
  
  updateBrainDump: (id, updates) => {
    const brainDumps = new Map(get().brainDumps);
    const brainDump = brainDumps.get(id);
    if (brainDump) {
      brainDumps.set(id, { ...brainDump, ...updates, updatedAt: Date.now() });
      set({ brainDumps });
    }
  },
  
  // Idea Actions
  addIdea: (idea) => {
    const currentId = get().currentBrainDumpId;
    if (!currentId) return;
    
    const brainDumps = new Map(get().brainDumps);
    const brainDump = brainDumps.get(currentId);
    if (brainDump) {
      const ideas = new Map(brainDump.ideas);
      ideas.set(idea.id, idea);
      brainDumps.set(currentId, { ...brainDump, ideas, updatedAt: Date.now() });
      set({ brainDumps });
      get().pushHistory();
    }
  },
  
  updateIdea: (id, updates) => {
    const currentId = get().currentBrainDumpId;
    if (!currentId) return;
    
    const brainDumps = new Map(get().brainDumps);
    const brainDump = brainDumps.get(currentId);
    if (brainDump) {
      const ideas = new Map(brainDump.ideas);
      const idea = ideas.get(id);
      if (idea) {
        ideas.set(id, { ...idea, ...updates, updatedAt: Date.now() });
        brainDumps.set(currentId, { ...brainDump, ideas, updatedAt: Date.now() });
        set({ brainDumps });
      }
    }
  },
  
  deleteIdea: (id) => {
    const currentId = get().currentBrainDumpId;
    if (!currentId) return;
    
    const brainDumps = new Map(get().brainDumps);
    const brainDump = brainDumps.get(currentId);
    if (brainDump) {
      const ideas = new Map(brainDump.ideas);
      ideas.delete(id);
      
      // Remove edges connected to this idea
      const edges = brainDump.edges.filter(
        edge => edge.sourceId !== id && edge.targetId !== id
      );
      
      brainDumps.set(currentId, { ...brainDump, ideas, edges, updatedAt: Date.now() });
      set({ brainDumps });
      get().pushHistory();
    }
  },
  
  deleteSelectedIdeas: () => {
    const selectedIds = get().selectedIds;
    selectedIds.forEach(id => get().deleteIdea(id));
    set({ selectedIds: new Set() });
  },
  
  moveIdea: (id, x, y) => {
    get().updateIdea(id, { x, y });
  },
  
  // Edge Actions
  addEdge: (edge) => {
    const currentId = get().currentBrainDumpId;
    if (!currentId) return;
    
    const brainDumps = new Map(get().brainDumps);
    const brainDump = brainDumps.get(currentId);
    if (brainDump) {
      const edges = [...brainDump.edges, edge];
      brainDumps.set(currentId, { ...brainDump, edges, updatedAt: Date.now() });
      set({ brainDumps });
      get().pushHistory();
    }
  },
  
  deleteEdge: (id) => {
    const currentId = get().currentBrainDumpId;
    if (!currentId) return;
    
    const brainDumps = new Map(get().brainDumps);
    const brainDump = brainDumps.get(currentId);
    if (brainDump) {
      const edges = brainDump.edges.filter(edge => edge.id !== id);
      brainDumps.set(currentId, { ...brainDump, edges, updatedAt: Date.now() });
      set({ brainDumps });
      get().pushHistory();
    }
  },
  
  deleteSelectedEdges: () => {
    const selectedEdgeIds = get().selectedEdgeIds;
    selectedEdgeIds.forEach(id => get().deleteEdge(id));
    set({ selectedEdgeIds: new Set() });
  },
  
  // Selection Actions
  selectIdea: (id, multi = false) => {
    const selectedIds = multi ? new Set(get().selectedIds) : new Set<string>();
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    set({ selectedIds, selectedEdgeIds: new Set() });
  },
  
  selectEdge: (id, multi = false) => {
    const selectedEdgeIds = multi ? new Set(get().selectedEdgeIds) : new Set<string>();
    if (selectedEdgeIds.has(id)) {
      selectedEdgeIds.delete(id);
    } else {
      selectedEdgeIds.add(id);
    }
    set({ selectedEdgeIds, selectedIds: new Set() });
  },
  
  clearSelection: () => {
    set({ selectedIds: new Set(), selectedEdgeIds: new Set() });
  },
  
  selectMultiple: (ids) => {
    set({ selectedIds: new Set(ids), selectedEdgeIds: new Set() });
  },
  
  // Canvas Actions
  setPan: (panX, panY) => {
    set({ panX, panY });
    const currentId = get().currentBrainDumpId;
    if (currentId) {
      get().updateBrainDump(currentId, { panX, panY });
    }
  },
  
  setZoom: (zoom) => {
    const clampedZoom = Math.max(0.1, Math.min(3, zoom));
    set({ zoom: clampedZoom });
    const currentId = get().currentBrainDumpId;
    if (currentId) {
      get().updateBrainDump(currentId, { zoom: clampedZoom });
    }
  },
  
  setTheme: (theme) => {
    set({ theme });
    const currentId = get().currentBrainDumpId;
    if (currentId) {
      get().updateBrainDump(currentId, { theme });
    }
  },
  
  toggleGrid: () => {
    set({ showGrid: !get().showGrid });
  },
  
  resetViewport: () => {
    set({ panX: 0, panY: 0, zoom: 1 });
    const currentId = get().currentBrainDumpId;
    if (currentId) {
      get().updateBrainDump(currentId, { panX: 0, panY: 0, zoom: 1 });
    }
  },
  
  // Connection Actions
  startConnection: (sourceId) => {
    set({
      isCreatingConnection: true,
      connectionSourceId: sourceId,
      touchedNodesInConnection: new Set(),
      selectedIds: new Set(),
      selectedEdgeIds: new Set(),
    });
  },
  
  updateConnectionState: (mouseX, mouseY) => {
    const sourceId = get().connectionSourceId;
    if (sourceId) {
      set({ connectionState: { sourceId, mouseX, mouseY } });
    }
  },
  
  endConnection: (targetId) => {
    const sourceId = get().connectionSourceId;
    if (sourceId && targetId && sourceId !== targetId) {
      // Check if edge already exists
      const brainDump = get().getCurrentBrainDump();
      const existingEdge = brainDump?.edges.find(
        e => (e.sourceId === sourceId && e.targetId === targetId) ||
             (e.sourceId === targetId && e.targetId === sourceId)
      );
      
      if (existingEdge) {
        // Delete existing edge
        get().deleteEdge(existingEdge.id);
      } else {
        // Create new edge
        const edge: Edge = {
          id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sourceId,
          targetId,
          relationshipType: 'relates-to',
          createdAt: Date.now(),
        };
        get().addEdge(edge);
      }
    }
    get().cancelConnection();
  },
  
  cancelConnection: () => {
    set({
      isCreatingConnection: false,
      connectionSourceId: null,
      connectionState: null,
      hoveredNodeId: null,
      touchedNodesInConnection: new Set(),
    });
  },
  
  setHoveredNodeId: (id) => {
    set({ hoveredNodeId: id });
  },
  
  addTouchedNodeInConnection: (id) => {
    const touched = new Set(get().touchedNodesInConnection);
    touched.add(id);
    set({ touchedNodesInConnection: touched });
  },
  
  clearTouchedNodesInConnection: () => {
    set({ touchedNodesInConnection: new Set() });
  },
  
  // Box Selection Actions
  startBoxSelection: (x, y, append = false) => {
    set({
      boxSelection: { startX: x, startY: y, currentX: x, currentY: y, append },
      ...(append ? {} : { selectedIds: new Set(), selectedEdgeIds: new Set() }),
    });
  },
  
  updateBoxSelection: (x, y) => {
    const boxSelection = get().boxSelection;
    if (boxSelection) {
      set({ boxSelection: { ...boxSelection, currentX: x, currentY: y } });
    }
  },
  
  endBoxSelection: () => {
    const boxSelection = get().boxSelection;
    if (boxSelection) {
      const existingIdeaSelection = boxSelection.append ? new Set(get().selectedIds) : new Set<string>();
      const existingEdgeSelection = boxSelection.append ? new Set(get().selectedEdgeIds) : new Set<string>();

      // Calculate selection box bounds
      const minX = Math.min(boxSelection.startX, boxSelection.currentX);
      const maxX = Math.max(boxSelection.startX, boxSelection.currentX);
      const minY = Math.min(boxSelection.startY, boxSelection.currentY);
      const maxY = Math.max(boxSelection.startY, boxSelection.currentY);
      
      // Find ideas within box
      const brainDump = get().getCurrentBrainDump();
      if (brainDump) {
        const selectedIds = new Set<string>();
        const ideaWithinSelection = (idea: Idea) => {
          const ideaWidth = idea.width || 200;
          const ideaHeight = idea.height || 100;
          return (
            idea.x < maxX &&
            idea.x + ideaWidth > minX &&
            idea.y < maxY &&
            idea.y + ideaHeight > minY
          );
        };

        brainDump.ideas.forEach((idea, id) => {
          if (ideaWithinSelection(idea)) {
            selectedIds.add(id);
          }
        });

        selectedIds.forEach(id => existingIdeaSelection.add(id));

        // Select edges when both endpoints are within the selection
        brainDump.edges.forEach(edge => {
          const sourceIdea = brainDump.ideas.get(edge.sourceId);
          const targetIdea = brainDump.ideas.get(edge.targetId);
          if (!sourceIdea || !targetIdea) return;

          if (ideaWithinSelection(sourceIdea) && ideaWithinSelection(targetIdea)) {
            existingEdgeSelection.add(edge.id);
          }
        });

        set({ selectedIds: existingIdeaSelection, selectedEdgeIds: existingEdgeSelection });
      }
    }
    set({ boxSelection: null });
  },
  
  // Modal Actions
  openDetailModal: (ideaId) => {
    set({ detailModalOpen: true, detailModalIdeaId: ideaId });
  },
  
  closeDetailModal: () => {
    set({ detailModalOpen: false, detailModalIdeaId: null });
  },
  
  openSettingsModal: () => {
    set({ settingsModalOpen: true });
  },
  
  closeSettingsModal: () => {
    set({ settingsModalOpen: false });
  },
  
  toggleKeyboardShortcuts: () => {
    set({ keyboardShortcutsModalOpen: !get().keyboardShortcutsModalOpen });
  },
  
  // UI Actions
  setSidePanelWidth: (width) => {
    set({ sidePanelWidth: Math.max(60, Math.min(400, width)) });
  },
  
  toggleSidePanelCollapsed: () => {
    set({ sidePanelCollapsed: !get().sidePanelCollapsed });
  },
  
  // Undo/Redo Actions
  pushHistory: () => {
    const brainDump = get().getCurrentBrainDump();
    if (!brainDump) return;
    
    const history = get().history.slice(0, get().historyIndex + 1);
    history.push(JSON.parse(JSON.stringify(brainDump)));
    
    // Limit history to 50 items
    if (history.length > 50) {
      history.shift();
    } else {
      set({ historyIndex: get().historyIndex + 1 });
    }
    
    set({ history });
  },
  
  undo: () => {
    if (!get().canUndo()) return;
    
    const newIndex = get().historyIndex - 1;
    const brainDump = get().history[newIndex];
    const currentId = get().currentBrainDumpId;
    
    if (brainDump && currentId) {
      const brainDumps = new Map(get().brainDumps);
      brainDumps.set(currentId, brainDump);
      set({ brainDumps, historyIndex: newIndex });
    }
  },
  
  redo: () => {
    if (!get().canRedo()) return;
    
    const newIndex = get().historyIndex + 1;
    const brainDump = get().history[newIndex];
    const currentId = get().currentBrainDumpId;
    
    if (brainDump && currentId) {
      const brainDumps = new Map(get().brainDumps);
      brainDumps.set(currentId, brainDump);
      set({ brainDumps, historyIndex: newIndex });
    }
  },
  
  canUndo: () => {
    return get().historyIndex > 0;
  },
  
  canRedo: () => {
    return get().historyIndex < get().history.length - 1;
  },
  
  // Helpers
  getCurrentBrainDump: () => {
    const currentId = get().currentBrainDumpId;
    return currentId ? get().brainDumps.get(currentId) || null : null;
  },
  
  getIdea: (id) => {
    const brainDump = get().getCurrentBrainDump();
    return brainDump?.ideas.get(id) || null;
  },
  
  getSelectedIdeas: () => {
    const brainDump = get().getCurrentBrainDump();
    if (!brainDump) return [];
    
    const selectedIds = get().selectedIds;
    return Array.from(selectedIds)
      .map(id => brainDump.ideas.get(id))
      .filter((idea): idea is Idea => idea !== undefined);
  },
}));

