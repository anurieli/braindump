'use client'

import { useState } from 'react';
import { useStore } from '@/store';
import { signOut } from '@/lib/auth-helpers';
import { useRouter } from 'next/navigation';
import { 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit2,
  LogOut,
  Brain,
  Check
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function SidePanel() {
  const router = useRouter();
  const brainDumps = useStore(state => state.brainDumps);
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId);
  
  const switchBrainDump = useStore(state => state.switchBrainDump);
  const createBrainDump = useStore(state => state.createBrainDump);
  const updateBrainDumpName = useStore(state => state.updateBrainDumpName);
  const archiveBrainDump = useStore(state => state.archiveBrainDump);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };
  
  const handleCreateBrainDump = async () => {
    const id = await createBrainDump('New Brain Dump');
    setEditingId(id);
    setEditingName('New Brain Dump');
  };
  
  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };
  
  const handleSaveEdit = async () => {
    if (editingId && editingName.trim()) {
      await updateBrainDumpName(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this brain dump?')) {
      await archiveBrainDump(id);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  return (
    <div className="w-80 h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Hi, anurieli365</h1>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6">
        {/* New Brain Dump Button */}
        <button
          onClick={handleCreateBrainDump}
          className="w-full bg-gray-200 hover:bg-gray-300 rounded-2xl p-4 mb-6 flex items-center justify-center gap-3 transition-colors"
        >
          <Plus className="w-5 h-5 text-gray-700" />
          <span className="text-gray-700 font-medium">New Brain Dump</span>
        </button>
        
        {/* Brain Dumps List */}
        <div className="space-y-4">
          {brainDumps.map(brainDump => {
            const isActive = brainDump.id === currentBrainDumpId;
            const isEditing = editingId === brainDump.id;
            
            // Use counts from database (stored in brainDump) or fallback to 0
            const ideaCount = brainDump.idea_count ?? 0;
            const connectionCount = brainDump.edge_count ?? 0;
            const lastUpdated = brainDump.updated_at ? new Date(brainDump.updated_at) : new Date();
            
            return (
              <div
                key={brainDump.id}
                className={`
                  group bg-white rounded-2xl p-6 cursor-pointer transition-all hover:shadow-sm border-2 relative
                  ${isActive ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-gray-200'}
                `}
                onClick={() => !isEditing && switchBrainDump(brainDump.id)}
              >
                {/* Active indicator badge */}
                {isActive && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                
                {isEditing ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="text-lg font-semibold border-none p-0 h-auto focus:ring-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl">👋</span>
                        <h3 className={`text-lg font-semibold ${isActive ? 'text-purple-900' : 'text-gray-900'}`}>
                          {brainDump.name}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(brainDump.id, brainDump.name);
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(brainDump.id);
                          }}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                    
                    <div className={`text-sm mb-3 ${isActive ? 'text-purple-700' : 'text-gray-600'}`}>
                      {ideaCount} ideas • {connectionCount} connections
                    </div>
                    
                    <div className="text-gray-400 text-xs">
                      Updated {formatDate(lastUpdated)}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* User Section */}
      <div className="p-6 border-t border-gray-200">
        <div className="mb-4">
          <div className="text-gray-900 font-medium">anurieli365</div>
          <div className="text-gray-500 text-sm">anurieli365@gmail.com</div>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
