'use client'

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface FileDropModalProps {
  isOpen: boolean;
  fileName: string;
  onConfirm: (description: string) => void;
  onCancel: () => void;
}

export default function FileDropModal({ isOpen, fileName, onConfirm, onCancel }: FileDropModalProps) {
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus and select all text after a brief delay for smooth UX
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      // Set default description as filename without extension
      const defaultDescription = fileName.replace(/\.[^/.]+$/, '');
      setDescription(defaultDescription);
    }
  }, [isOpen, fileName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDescription = description.trim() || fileName;
    onConfirm(finalDescription);
    setDescription('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
      setDescription('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add File Description</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            File: <span className="font-medium">{fileName}</span>
          </p>
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a description for this file..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
            />
          </form>
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
          >
            Add File
          </button>
        </div>
      </div>
    </div>
  );
}