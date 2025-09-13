'use client'

import { Card } from '@/components/card'
import { cn } from '@/lib/utils'
import { Copy, Download, Trash2, Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useBrowserEvents } from '@/store/browser-events'

interface TextDisplayProps {
  className?: string
}

export function TextDisplay({ className }: TextDisplayProps) {
  const { events, clearEvents } = useBrowserEvents()
  const [autoScroll, setAutoScroll] = useState(true)
  
  // Format events for display
  const formatEvent = (event: any) => {
    const time = new Date(event.timestamp).toLocaleTimeString()
    let eventLine = `[${time}] ${event.type.toUpperCase()}`
    
    if (event.element.tagName) {
      eventLine += ` - <${event.element.tagName.toLowerCase()}`
      if (event.element.id) eventLine += ` id="${event.element.id}"`
      if (event.element.className) eventLine += ` class="${event.element.className}"`
      eventLine += `>`
    }
    
    if (event.type === 'click') {
      eventLine += ` at (${event.details.x}, ${event.details.y})`
    } else if (event.type === 'input') {
      eventLine += ` value: "${event.details.value}"`
    } else if (event.type === 'keypress') {
      eventLine += ` key: "${event.details.key}"`
      if (event.details.ctrlKey) eventLine += ' +Ctrl'
      if (event.details.shiftKey) eventLine += ' +Shift'
      if (event.details.altKey) eventLine += ' +Alt'
    } else if (event.type === 'scroll') {
      eventLine += ` to (${event.details.scrollX}, ${event.details.scrollY})`
    } else if (event.type === 'submit') {
      const formData = event.details.formData?.map((item: any) => `${item.key}=${item.value}`).join(', ') || ''
      eventLine += ` data: {${formData}}`
    }
    
    if (event.element.text && event.type === 'click') {
      eventLine += ` text: "${event.element.text.substring(0, 50)}..."`
    }
    
    if (event.element.href) {
      eventLine += ` href: "${event.element.href}"`
    }
    
    return eventLine
  }
  
  const eventsText = events.map(formatEvent).join('\n')
  
  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll) {
      const container = document.querySelector('.event-container')
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }
  }, [events, autoScroll])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(eventsText)
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleClear = () => {
    clearEvents()
  }

  const handleDownload = () => {
    const blob = new Blob([eventsText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `browser-events-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-medium">Browser Events</h3>
          <span className="text-xs text-gray-500">({events.length} events)</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>
          <div className="flex gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Download as file"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-red-500"
            title="Clear events"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-3 overflow-auto event-container">
        {events.length === 0 ? (
          <div className="text-gray-500 text-sm text-center mt-8">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No browser events captured yet.</p>
            <p className="text-xs mt-1">Navigate and interact with the browser to see events here.</p>
          </div>
        ) : (
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {eventsText}
          </pre>
        )}
      </div>
      
      <div className="px-3 py-1 border-t text-xs text-gray-500">
        {events.length} events | {eventsText.length} characters | Last: {events.length > 0 ? new Date(events[events.length - 1].timestamp).toLocaleTimeString() : 'N/A'}
      </div>
    </Card>
  )
}