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
  const [allAttachments, setAllAttachments] = useState<any[]>([]);
  const [isAllAttachmentsLoading, setIsAllAttachmentsLoading] = useState(false);
  const [allAttachmentsError, setAllAttachmentsError] = useState<string | null>(null);
  
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
  
  // Load all attachments for any idea type (including text with links)
  useEffect(() => {
    if (!isOpen || !idea) {
      setAllAttachments([]);
      setAllAttachmentsError(null);
      setIsAllAttachmentsLoading(false);
      return;
    }
    let cancelled = false;
    setIsAllAttachmentsLoading(true);
    setAllAttachmentsError(null);
    const loadAll = async () => {
      try {
        const { data, error } = await supabase
          .from('attachments')
          .select('*')
          .eq('idea_id', idea.id);
        if (error) throw error;
        if (!cancelled) {
          setAllAttachments(data || []);
        }
      } catch (e) {
        if (!cancelled) {
          setAllAttachmentsError('Unable to load attachments');
          setAllAttachments([]);
        }
      } finally {
        if (!cancelled) {
          setIsAllAttachmentsLoading(false);
        }
      }
    };
    loadAll();
    return () => { cancelled = true; };
  }, [isOpen, idea?.id]);

  if (!isOpen || !idea) return null;

  const ideaMetadata = idea.metadata as Record<string, unknown> | undefined;
  const ideaPreviewUrl = typeof ideaMetadata?.['previewUrl'] === 'string' ? ideaMetadata?.['previewUrl'] : undefined;
  const ideaThumbnailUrl = typeof ideaMetadata?.['thumbnailUrl'] === 'string' ? ideaMetadata?.['thumbnailUrl'] : undefined;
  const attachmentUrl = attachmentData?.metadata?.previewUrl || attachmentData?.url || ideaPreviewUrl || ideaThumbnailUrl;

  const highlightText = (isEditing ? editedText : idea.text) || idea.text;
  const formattedCreatedAt = idea.created_at ? new Date(idea.created_at).toLocaleString() : '';

  const handleSave = () => {
    if (editedText.trim()) {
      updateIdeaText(idea.id, editedText.trim(), { skipAI: true });
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
        className="idea-modal w-full max-w-2xl max-h-[90vh] overflow-hidden border-0 p-0 text-slate-100 [&>button[data-radix-dialog-close]]:hidden"
      >
        <DialogTitle className="sr-only">Idea Details</DialogTitle>
        <DialogDescription className="sr-only">
          View and edit idea details, attachments, and relationships
        </DialogDescription>

        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 px-8 pt-8">
            <div className="flex-1 space-y-2">
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">
                Idea
              </p>
              {isEditing ? (
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  rows={1}
                  className="idea-textarea text-2xl font-semibold leading-tight w-full"
                  autoFocus
                />
              ) : (
                <h2 className="text-2xl font-semibold leading-tight text-white">
                  {idea.text}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
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
                </>
              ) : (
                <>
                  {idea.type === 'attachment' && attachmentUrl && (
                    <Button
                      onClick={() => window.open(attachmentUrl, '_blank')}
                      variant="ghost"
                      size="icon"
                      className="glass-icon-button"
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
                    className="glass-icon-button"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="ghost"
                    size="icon"
                    className="glass-icon-button hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={closeModal}
                    variant="ghost"
                    size="icon"
                    className="glass-icon-button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </header>

          <div className="idea-divider mx-8 my-6" />

          <div className="flex-1 space-y-8 overflow-y-auto px-8 pb-24">
            <section className="idea-modal-section text-center">
              <p className="mx-auto mt-5 max-w-xl whitespace-pre-wrap text-base text-white/80">
                {idea.text}
              </p>
            </section>

            {idea.type === 'attachment' && (
              <section className="idea-modal-section">
                <h3 className="section-title">Attachment Preview</h3>
                <div className="relative mt-4 flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {isAttachmentLoading && (
                    <div className="absolute inset-0 animate-pulse bg-white/10" />
                  )}
                  {attachmentError && (
                    <p className="z-10 px-4 text-sm text-rose-200">
                      {attachmentError}
                    </p>
                  )}
                  {!isAttachmentLoading && !attachmentError && attachmentUrl && (
                    <img
                      src={attachmentUrl}
                      alt={attachmentData?.filename || idea.text}
                      draggable={false}
                      className="max-h-[320px] w-full object-contain"
                    />
                  )}
                  {!isAttachmentLoading &&
                    !attachmentError &&
                    !attachmentUrl && (
                      <p className="px-4 text-sm text-white/60">
                        No preview available
                      </p>
                    )}
                </div>
              </section>
            )}

            <section className="idea-modal-section">
              <div className="flex items-center justify-between">
                <h3 className="section-title">Attachments</h3>
                {allAttachments.length > 0 && !isAllAttachmentsLoading && (
                  <span className="text-xs font-medium text-white/60">
                    {allAttachments.length}{' '}
                    {allAttachments.length === 1 ? 'file' : 'files'}
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-3 text-left text-sm text-white/70">
                {isAllAttachmentsLoading && <p>Loading attachments…</p>}
                {allAttachmentsError && (
                  <p className="text-rose-200">{allAttachmentsError}</p>
                )}
                {!isAllAttachmentsLoading &&
                  !allAttachmentsError &&
                  allAttachments.length === 0 && (
                    <p className="text-white/60">No attachments</p>
                  )}
                {!isAllAttachmentsLoading &&
                  !allAttachmentsError &&
                  allAttachments.length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {allAttachments.map((att) => {
                        const type = att.type as string;
                        const url =
                          (att.metadata?.previewUrl as string) ||
                          (att.metadata?.thumbnailUrl as string) ||
                          (att.url as string);
                        const title =
                          (att.metadata?.title as string) ||
                          (att.filename as string) ||
                          (att.url as string) ||
                          'Attachment';
                        const open = () => {
                          if (url) window.open(url, '_blank');
                        };

                        return (
                          <button
                            key={att.id}
                            type="button"
                            onClick={open}
                            className="attachment-item group"
                          >
                            <div className="attachment-thumb">
                              {type === 'image' || type === 'url' ? (
                                url ? (
                                  <img
                                    src={url}
                                    alt={title}
                                    className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
                                  />
                                ) : (
                                  <span>No preview</span>
                                )
                              ) : (
                                <span>{type.toUpperCase()}</span>
                              )}
                            </div>
                            <div className="attachment-meta">
                              <p className="truncate font-medium text-white">
                                {title}
                              </p>
                              {att.url && (
                                <span className="text-xs text-cyan-200">
                                  Open in new tab
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>
            </section>

            <section className="idea-modal-section">
              <h3 className="section-title">Relationship Tree</h3>
              {parents.length === 0 && children.length === 0 ? (
                <p className="mt-3 text-sm text-white/60">
                  No relationships yet.
                </p>
              ) : (
                <div className="mt-4 space-y-5">
                  {parents.map(({ edge, idea: parentIdea }) => (
                    <div
                      key={edge.id}
                      className="flex flex-wrap items-center justify-center gap-3"
                    >
                      <div className="glass-pill glass-pill--edge">
                        {edge.type}
                        <span className="pill-subtle">Parent</span>
                      </div>
                      <span className="relationship-arrow">→</span>
                      <button
                        type="button"
                        className="glass-pill glass-pill--node"
                        onClick={() => handleNodeClick(parentIdea!.id)}
                      >
                        {parentIdea?.text || 'Untitled'}
                      </button>
                    </div>
                  ))}

                  {(parents.length > 0 || children.length > 0) && (
                    <div className="flex justify-center">
                      <div className="glass-pill glass-pill--current text-sm">
                        Current: {idea.text}
                      </div>
                    </div>
                  )}

                  {children.map(({ edge, idea: childIdea }) => (
                    <div
                      key={edge.id}
                      className="flex flex-wrap items-center justify-center gap-3"
                    >
                      <button
                        type="button"
                        className="glass-pill glass-pill--node"
                        onClick={() => handleNodeClick(childIdea!.id)}
                      >
                        {childIdea?.text || 'Untitled'}
                      </button>
                      <span className="relationship-arrow">←</span>
                      <div className="glass-pill glass-pill--edge">
                        {edge.type}
                        <span className="pill-subtle">Child</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {idea.summary && (
              <section className="idea-modal-section">
                <h3 className="section-title">AI Summary</h3>
                <p className="mt-3 text-sm text-white/70">{idea.summary}</p>
              </section>
            )}
          </div>

          <footer className="idea-modal-footer">
            <span className="text-xs text-white/60">
              Created {formattedCreatedAt}
            </span>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
