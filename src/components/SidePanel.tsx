'use client'

import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { signOut } from '@/lib/auth-helpers';
import { useRouter } from 'next/navigation';
import { saveUserPreferencesManually } from '@/hooks/useUserPreferences';
import { 
  ChevronRight, 
  ChevronLeft,
  Plus, 
  Trash2, 
  Edit2,
  LogOut,
  Brain
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tooltip } from '@/components/ui/tooltip';
import { themes } from '@/lib/themes';

export default function SidePanel() {
  const router = useRouter();
  const brainDumps = useStore(state => state.brainDumps);
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId);
  const theme = useStore(state => state.theme);
  
  const switchBrainDump = useStore(state => state.switchBrainDump);
  const createBrainDump = useStore(state => state.createBrainDump);
  const updateBrainDumpName = useStore(state => state.updateBrainDumpName);
  const archiveBrainDump = useStore(state => state.archiveBrainDump);
  const toggleSidebar = useStore(state => state.toggleSidebar);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [timestampTrigger, setTimestampTrigger] = useState(0);
  
  const isDark = themes[theme]?.isDark ?? false;
  
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

  const handleToggleSidebar = async () => {
    toggleSidebar();
    
    // Save sidebar preference to database
    try {
      await saveUserPreferencesManually();
    } catch (error) {
      console.error('Failed to save sidebar preference:', error);
    }
  };

  const handleSidebarClick = (e: React.MouseEvent) => {
    // Check if the click is on an interactive element or its children
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, input, a, [role="button"], [onclick]');

    // Only toggle if clicking on empty space (not on interactive elements)
    // Interactive elements should call e.stopPropagation() to prevent this
    if (!isInteractive) {
      handleToggleSidebar();
    }
  };

  // Update timestamps every minute for real-time display
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestampTrigger(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'now';
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

  const isSidebarOpen = useStore(state => state.isSidebarOpen);

  return (
    <div 
      className={`h-full flex flex-col transition-all duration-300 cursor-pointer ${
        isSidebarOpen ? 'w-80' : 'w-16'
      } ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      onClick={handleSidebarClick}
    >
      {/* Header */}
      <div 
        className={`flex items-center transition-all duration-300 ${
          isSidebarOpen ? 'p-6 justify-between' : 'p-3 justify-center'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center gap-3 transition-all duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
        }`}>
          <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-semibold whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-900'}`}>Hi, anurieli365</h1>
          </div>
        </div>
        {!isSidebarOpen && (
          <Tooltip content="Brain Dump Canvas" side="right">
            <div className="bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0 w-10 h-10">
              <Brain className="w-5 h-5 text-white" />
            </div>
          </Tooltip>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleSidebar();
          }}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-400'}`}
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>
      
      {/* Content */}
      <div 
        className={`flex-1 overflow-y-auto transition-all duration-300 ${
          isSidebarOpen ? 'px-6' : 'px-2'
        }`}
      >
        {/* New Brain Dump Button */}
        {isSidebarOpen ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCreateBrainDump();
            }}
            className={`w-full rounded-2xl mb-6 flex items-center justify-center gap-3 transition-all duration-300 p-4 ${
              isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium whitespace-nowrap">New Brain Dump</span>
          </button>
        ) : (
          <Tooltip content="New Brain Dump" side="right">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateBrainDump();
              }}
              className={`w-full rounded-2xl mb-6 flex items-center justify-center gap-3 transition-all duration-300 p-3 ${
                isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
            </button>
          </Tooltip>
        )}
        
        {/* Brain Dumps List */}
        <div 
          className={`space-y-4 transition-all duration-300 ${
            isSidebarOpen ? '' : 'space-y-2'
          }`}
        >
          {brainDumps.map(brainDump => {
            const isActive = brainDump.id === currentBrainDumpId;
            const isEditing = editingId === brainDump.id;
            
            // Use counts from database (stored in brainDump) or fallback to 0
            const ideaCount = brainDump.idea_count ?? 0;
            const connectionCount = brainDump.edge_count ?? 0;
            const lastUpdated = brainDump.updated_at ? new Date(brainDump.updated_at) : new Date();
            
            const brainDumpContent = (
              <div
                className={`
                  group rounded-2xl cursor-pointer transition-all hover:shadow-sm border-2 relative
                  ${isActive 
                    ? `border-purple-500 shadow-md ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}` 
                    : isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }
                  ${isSidebarOpen ? 'p-6' : 'p-3'}
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isEditing) {
                    switchBrainDump(brainDump.id);
                  }
                }}
              >
                
                {isSidebarOpen ? (
                  isEditing ? (
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
                          <h3 className={`text-lg font-semibold ${
                            isActive 
                              ? isDark ? 'text-purple-300' : 'text-purple-900'
                              : isDark ? 'text-gray-100' : 'text-gray-900'
                          }`}>
                            {brainDump.name}
                          </h3>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(brainDump.id, brainDump.name);
                            }}
                            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          >
                            <Edit2 className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(brainDump.id);
                            }}
                            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-50'}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                      
                      <div className={`text-sm mb-3 ${
                        isActive 
                          ? isDark ? 'text-purple-400' : 'text-purple-700'
                          : isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {ideaCount} ideas • {connectionCount} connections
                      </div>
                      
                      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Updated {formatDate(lastUpdated)}
                      </div>
                    </>
                  )
                ) : (
                  <div className="flex items-center justify-center">
                    <span className="text-2xl">👋</span>
                  </div>
                )}
              </div>
            );

            return (
              <div key={brainDump.id}>
                {isSidebarOpen ? (
                  brainDumpContent
                ) : (
                  <Tooltip content={brainDump.name} side="right">
                    {brainDumpContent}
                  </Tooltip>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* User Section */}
      <div 
        className={`border-t transition-all duration-300 ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        } ${isSidebarOpen ? 'p-6' : 'p-3'}`}
      >
        {isSidebarOpen ? (
          <>
            <div className="mb-4">
              <div className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>anurieli365</div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>anurieli365@gmail.com</div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className={`flex items-center gap-3 transition-colors ${
                isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </>
        ) : (
          <Tooltip content="Log Out" side="right">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className={`w-full flex items-center justify-center transition-colors ${
                isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

