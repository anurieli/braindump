'use client'

import { useEffect, useState } from 'react';

interface ShortcutAssistantProps {
  isVisible: boolean;
  message: string;
}

export default function ShortcutAssistant({ isVisible, message }: ShortcutAssistantProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      // Delay unmount to allow fade-out animation
      const timeout = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timeout);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`
        absolute bottom-6 left-6 z-50
        liquid-glass rounded-2xl px-6 py-3 shadow-2xl
        transition-opacity duration-200
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="text-sm font-medium">
          {message}
        </div>
        <div className="px-2 py-1 bg-current/10 rounded text-xs font-mono">
          ⌘
        </div>
      </div>
    </div>
  );
}
