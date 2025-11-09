'use client'

import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { Input } from '@/components/ui/input';
import { Edit2, HelpCircle } from 'lucide-react';

export default function CanvasHeader() {
  // Use stable selectors to avoid infinite loops
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId);
  const brainDumps = useStore(state => state.brainDumps);
  const currentBrainDump = useMemo(() => {
    return brainDumps.find(bd => bd.id === currentBrainDumpId) || null;
  }, [brainDumps, currentBrainDumpId]);
  
  const updateBrainDumpName = useStore(state => state.updateBrainDumpName);
  const ideas = useStore(state => state.ideas);
  const edges = useStore(state => state.edges);
  const openModal = useStore(state => state.openModal);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  
  if (!currentBrainDump) return null;
  
  const ideaCount = Array.isArray(ideas) ? ideas.length : 0;
  const edgeCount = Array.isArray(edges) ? edges.length : 0;
  
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditName(currentBrainDump.name);
  };
  
  const handleSaveEdit = async () => {
    if (editName.trim() && currentBrainDumpId) {
      await updateBrainDumpName(currentBrainDumpId, editName.trim());
    }
    setIsEditing(false);
  };
  
  return (
    <div className="absolute top-6 left-6 z-40">
      <div className="liquid-glass rounded-2xl px-6 py-3 shadow-2xl">
        <div className="flex items-center gap-4">
          {/* Brain Dump Name */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                autoFocus
                className="h-8 w-64"
              />
            ) : (
              <>
                <h1 className="text-base font-semibold">
                  {currentBrainDump.name}
                </h1>
                <button
                  onClick={handleStartEdit}
                  className="p-1 hover:bg-current/10 rounded transition-colors"
                  title="Rename"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openModal('help')}
                  className="p-1 hover:bg-current/10 rounded transition-colors ml-1"
                  title="Help"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm opacity-70 border-l border-current/20 pl-4">
            <div>
              <span className="font-medium">{ideaCount}</span> {ideaCount === 1 ? 'idea' : 'ideas'}
            </div>
            <div>
              <span className="font-medium">{edgeCount}</span> {edgeCount === 1 ? 'connection' : 'connections'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
