'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  children: React.ReactNode
  content: string
  side?: 'left' | 'right' | 'top' | 'bottom'
  className?: string
}

export function Tooltip({ children, content, side = 'right', className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout>()

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 100)
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const arrowClasses = {
    left: 'border-r-gray-900 border-r-[6px] border-t-transparent border-t-[6px] border-b-transparent border-b-[6px] right-full top-1/2 -translate-y-1/2',
    right: 'border-l-gray-900 border-l-[6px] border-t-transparent border-t-[6px] border-b-transparent border-b-[6px] left-0 top-1/2 -translate-y-1/2 -translate-x-full',
    top: 'border-b-gray-900 border-b-[6px] border-l-transparent border-l-[6px] border-r-transparent border-r-[6px] bottom-full left-1/2 -translate-x-1/2',
    bottom: 'border-t-gray-900 border-t-[6px] border-l-transparent border-l-[6px] border-r-transparent border-r-[6px] top-full left-1/2 -translate-x-1/2',
  }

  const tooltipPositionClasses = {
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  }

  return (
    <div
      className="relative inline-block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div
        className={cn(
          'absolute z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none transition-opacity duration-150',
          tooltipPositionClasses[side],
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
          className
        )}
      >
        {content}
        <div
          className={cn(
            'absolute w-0 h-0',
            arrowClasses[side]
          )}
        />
      </div>
    </div>
  )
}

