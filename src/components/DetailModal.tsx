'use client'

import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { X, Edit2, Trash2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Attachment } from '@/types';

export default function DetailModal() {
  const activeModal = useStore(state => state.activeModal);
  const selectedIdeaId = useStore(state => state.selectedIdeaId);
  const closeModal = useStore(state => state.closeModal);
  const updateIdeaText = useStore(state => state.updateIdeaText);
  const deleteIdea = useStore(state => state.deleteIdea);
  const selectIdea = useStore(state => state.selectIdea);
  
  // Use stable selectors to avoid infinite loops
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId);
  const ideas = useStore(state => state.ideas);
  const edges = useStore(state => state.edges);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [attachmentData, setAttachmentData] = useState<Attachment | null>(null);
  const [isAttachmentLoading, setIsAttachmentLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  
  const isOpen = activeModal === 'idea-details' && selectedIdeaId !== null;
  
  // Get the idea
  const idea = useMemo(() => {
    return selectedIdeaId ? ideas[selectedIdeaId] : null;
  }, [ideas, selectedIdeaId]);
  
  useEffect(() => {
    if (!isOpen || !idea || idea.type !== 'attachment') {
      setAttachmentData(null);
      setAttachmentError(null);
      setIsAttachmentLoading(false);
      return;
    }

    let isCancelled = false;
    setIsAttachmentLoading(true);
    setAttachmentError(null);

    const loadAttachment = async () => {
      try {
        const { data, error } = await supabase
          .from('attachments')
          .select('*')
          .eq('idea_id', idea.id)
          .single();

        if (error) {
          throw error;
        }

        if (!isCancelled) {
          setAttachmentData(data);
        }
      } catch (error) {
        console.error('Failed to load attachment for modal:', error);
        if (!isCancelled) {
          setAttachmentError('Unable to load attachment');
        }
      } finally {
        if (!isCancelled) {
          setIsAttachmentLoading(false);
        }
      }
    };

    loadAttachment();

    return () => {
      isCancelled = true;
    };
  }, [idea?.id, idea?.type, isOpen]);

  // Get parent and child edges for this idea
  const { parents, children } = useMemo(() => {
    if (!idea || !currentBrainDumpId) {
      return { parents: [], children: [] };
    }
    
    const allEdges = Object.values(edges).filter(
      edge => edge.brain_dump_id === currentBrainDumpId
    );
    
    // Find parent edges (where this idea is the child)
    const parentEdges = allEdges.filter(e => e.child_id === idea.id);
    const parents = parentEdges.map(edge => ({
      edge,
      idea: ideas[edge.parent_id],
    })).filter(item => item.idea);
    
    // Find child edges (where this idea is the parent)
    const childEdges = allEdges.filter(e => e.parent_id === idea.id);
    const children = childEdges.map(edge => ({
      edge,
      idea: ideas[edge.child_id],
    })).filter(item => item.idea);
    
    return { parents, children };
  }, [edges, ideas, idea, currentBrainDumpId]);
  
  if (!isOpen || !idea) return null;

  const ideaMetadata = idea.metadata as Record<string, unknown> | undefined;
  const ideaPreviewUrl = typeof ideaMetadata?.['previewUrl'] === 'string' ? ideaMetadata?.['previewUrl'] : undefined;
  const ideaThumbnailUrl = typeof ideaMetadata?.['thumbnailUrl'] === 'string' ? ideaMetadata?.['thumbnailUrl'] : undefined;
  const attachmentUrl = attachmentData?.metadata?.previewUrl || attachmentData?.url || ideaPreviewUrl || ideaThumbnailUrl;

  const handleSave = () => {
    if (editedText.trim()) {
      updateIdeaText(idea.id, editedText.trim());
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Delete this idea?')) {
      deleteIdea(idea.id);
      closeModal();
    }
  };

  const handleNodeClick = (nodeId: string) => {
    selectIdea(nodeId);
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent 
        className="max-w-3xl max-h-[85vh] overflow-hidden border-0 p-0 liquid-glass"
      >
        {/* Accessibility: Hidden title and description for screen readers */}
        <DialogTitle className="sr-only">Idea Details</DialogTitle>
        <DialogDescription className="sr-only">
          View and edit idea details and relationships
        </DialogDescription>
        
        {/* Header with icon controls */}
        <div className="flex items-center justify-end gap-2 p-4 pb-3 border-b border-current/10">
          {idea.type === 'attachment' && attachmentUrl && (
            <Button
              onClick={() => window.open(attachmentUrl, '_blank')}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={() => {
              setEditedText(idea.text);
              setIsEditing(!isEditing);
            }}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleDelete}
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={closeModal}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main content area */}
        <div className="overflow-y-auto p-6 pt-4 pb-20" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {idea.type === 'attachment' && (
            <div className="mb-6">
              <div className="relative w-full max-h-[60vh] rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                {isAttachmentLoading && (
                  <div className="absolute inset-0 animate-pulse bg-gray-200" />
                )}
                {attachmentError && (
                  <p className="text-sm text-red-500 px-4 text-center z-10">{attachmentError}</p>
                )}
                {!isAttachmentLoading && !attachmentError && attachmentUrl && (
                  <img
                    src={attachmentUrl}
                    alt={attachmentData?.filename || idea.text}
                    className="max-h-[60vh] w-full object-contain"
                  />
                )}
                {!isAttachmentLoading && !attachmentError && !attachmentUrl && (
                  <p className="text-sm opacity-60 px-4 text-center">No preview available</p>
                )}
              </div>
            </div>
          )}

          {/* Idea content - centered and prominent */}
          <div className="mb-6">
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={6}
                  className="w-full text-lg"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm">
                    Save
                  </Button>
                  <Button 
                    onClick={() => setIsEditing(false)} 
                    variant="outline" 
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg whitespace-pre-wrap">
                  {idea.text}
                </p>
              </div>
            )}
          </div>
          
          {/* Relationship Tree */}
          {(parents.length > 0 || children.length > 0) && (
            <div className="mb-4">
              <h3 className="text-sm mb-4 opacity-70">
                Relationship Tree
              </h3>
              <div className="relative p-6 rounded-xl liquid-glass">
                {/* SVG for connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                  {/* Parent connections */}
                  {parents.map((parent, idx) => {
                    const startY = 20 + idx * 60;
                    return (
                      <g key={parent.edge.id}>
                        <line
                          x1={150}
                          y1={startY + 20}
                          x2="50%"
                          y2={parents.length * 60 + 50}
                          stroke="currentColor"
                          strokeWidth={2}
                          opacity={0.3}
                        />
                      </g>
                    );
                  })}
                  {/* Child connections */}
                  {children.map((child, idx) => {
                    const startY = parents.length * 60 + 140 + idx * 60;
                    return (
                      <g key={child.edge.id}>
                        <line
                          x1="50%"
                          y1={parents.length * 60 + 90}
                          x2={150}
                          y2={startY + 20}
                          stroke="currentColor"
                          strokeWidth={2}
                          opacity={0.3}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Parents (one level up) */}
                {parents.length > 0 && (
                  <div className="mb-8 space-y-3">
                    {parents.map(({ edge, idea: parentIdea }) => (
                      <div 
                        key={edge.id}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                        onClick={() => handleNodeClick(parentIdea!.id)}
                      >
                        <div className="flex-shrink-0">
                          <div 
                            className="px-2 py-1 rounded text-xs"
                            style={{ 
                              background: 'rgba(59, 130, 246, 0.2)',
                            }}
                          >
                            {edge.type}
                          </div>
                        </div>
                        <p className="text-sm flex-1 truncate">
                          {parentIdea?.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Current idea (center) */}
                <div 
                  className="my-6 p-4 rounded-lg text-center"
                  style={{
                    background: 'rgba(99, 102, 241, 0.25)',
                    border: '2px solid rgba(99, 102, 241, 0.4)',
                  }}
                >
                  <p className="text-sm truncate">
                    <strong>Current:</strong> {idea.text}
                  </p>
                </div>

                {/* Children (one level down) */}
                {children.length > 0 && (
                  <div className="mt-8 space-y-3">
                    {children.map(({ edge, idea: childIdea }) => (
                      <div 
                        key={edge.id}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                        style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                        }}
                        onClick={() => handleNodeClick(childIdea!.id)}
                      >
                        <div className="flex-shrink-0">
                          <div 
                            className="px-2 py-1 rounded text-xs"
                            style={{ 
                              background: 'rgba(34, 197, 94, 0.2)',
                            }}
                          >
                            {edge.type}
                          </div>
                        </div>
                        <p className="text-sm flex-1 truncate">
                          {childIdea?.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* AI Summary (if available) */}
          {idea.summary && (
            <div className="mb-4">
              <h3 className="text-sm mb-2 opacity-70">
                AI Summary
              </h3>
              <p className="text-sm opacity-60">
                {idea.summary}
              </p>
            </div>
          )}
        </div>

        {/* Footer with created date */}
        <div 
          className="absolute bottom-0 left-0 right-0 p-4 flex justify-end backdrop-blur-md border-t border-current/10"
        >
          <span className="text-xs opacity-50">
            Created {new Date(idea.created_at).toLocaleString()}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
