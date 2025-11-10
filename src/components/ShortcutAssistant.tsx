'use client'

interface ShortcutAssistantProps {
  isVisible: boolean;
  message: string;
}

export default function ShortcutAssistant({ isVisible, message }: ShortcutAssistantProps) {
  if (!isVisible) return null;
  
  return (
    <div 
      className="absolute bottom-6 left-6 z-50 liquid-glass rounded-2xl px-6 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center gap-3">
        <div className="text-lg">⌨️</div>
        <p className="text-sm font-medium">
          {message}
        </p>
      </div>
    </div>
  );
}
