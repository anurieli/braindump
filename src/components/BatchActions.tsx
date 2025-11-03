'use client'

import { useMemo } from 'react';
import { useStore } from '@/store';
import { getThemeTextColor } from '@/lib/themes';

export default function BatchActions() {
  const selectedIdeaIds = useStore(state => state.selectedIdeaIds);
  const selectedEdgeIds = useStore(state => state.selectedEdgeIds);
  const theme = useStore(state => state.theme);
  const deleteIdea = useStore(state => state.deleteIdea);
  const deleteEdge = useStore(state => state.deleteEdge);
  const clearSelection = useStore(state => state.clearSelection);

  const hasSelection = selectedIdeaIds.size > 0 || selectedEdgeIds.size > 0;
  const textColor = getThemeTextColor(theme);
  const bgColor = textColor === '#ffffff' 
    ? 'rgba(0, 0, 0, 0.8)' 
    : 'rgba(255, 255, 255, 0.9)';

  const handleDelete = async () => {
    console.log('🗑️ Starting batch delete:', { 
      ideaIds: Array.from(selectedIdeaIds), 
      edgeIds: Array.from(selectedEdgeIds) 
    });

    try {
      // Delete selected ideas (async operations)
      if (selectedIdeaIds.size > 0) {
        console.log('Deleting ideas...');
        for (const id of Array.from(selectedIdeaIds)) {
          console.log(`Deleting idea ${id}`);
          await deleteIdea(id);
        }
      }

      // Delete selected edges (async operations)
      if (selectedEdgeIds.size > 0) {
        console.log('Deleting edges...');
        for (const id of Array.from(selectedEdgeIds)) {
          console.log(`Deleting edge ${id}`);
          await deleteEdge(id);
        }
      }

      // Clear selection
      console.log('Clearing selection...');
      clearSelection();
      
      console.log('✅ Deletion complete');
    } catch (error) {
      console.error('❌ Error during batch delete:', error);
    }
  };

  if (!hasSelection) return null;

  const selectionCount = selectedIdeaIds.size + selectedEdgeIds.size;

  return (
    <div
      className="absolute top-20 right-6 z-40 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm transition-all"
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      <span className="text-sm font-medium">
        {selectionCount} {selectionCount === 1 ? 'item' : 'items'} selected
      </span>
      <button
        onClick={handleDelete}
        className="px-3 py-1 text-sm font-medium rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
        aria-label="Delete selected items"
      >
        Delete
      </button>
    </div>
  );
}

