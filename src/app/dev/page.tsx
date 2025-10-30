import StoreTest from '@/components/StoreTest'

export default function DevPage() {
  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          Brain Dump Canvas - Development Tools
        </h1>
        
        <div className="grid gap-8">
          <StoreTest />
          
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
              Development Progress
            </h2>
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span>Task 1: Environment Setup - Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span>Task 2: Database Schema - Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span>Task 3: Zustand Store Architecture - Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span>Task 4: Canvas System with Konva - Complete</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}