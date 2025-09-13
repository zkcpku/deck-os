'use client'

import { Card } from '@/components/card'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

interface TerminalProps {
  className?: string
}

// Dynamically import XTerm to avoid SSR issues
const XTermComponent = dynamic(() => import('./terminal-impl'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 p-2 bg-[#1e1e1e] text-white flex items-center justify-center">
      Loading terminal...
    </div>
  )
})

export function Terminal({ className }: TerminalProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-medium">Terminal</h3>
      </div>
      <XTermComponent />
    </Card>
  )
}