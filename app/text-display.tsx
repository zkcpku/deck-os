'use client'

import { Card } from '@/components/card'
import { cn } from '@/lib/utils'
import { Copy, Download, Trash2, Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useBrowserEvents } from '@/store/browser-events'
import JSZip from 'jszip'

interface TextDisplayProps {
  className?: string
  getTerminalContent?: () => string
}

export function TextDisplay({ className, getTerminalContent }: TextDisplayProps) {
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
    } else if (event.type === 'screenshot') {
      eventLine += ` - ${event.element.text}`
      eventLine += ` size: ${event.details.width}x${event.details.height}`
    } else if (event.type === 'console') {
      // Handle console events with truncated content
      const level = event.level || event.details?.level || 'log'
      eventLine = `[${time}] CONSOLE.${level.toUpperCase()}`
      
      if (event.args && event.args.length > 0) {
        // Join all console arguments
        const content = event.args.join(' ')
        // Truncate long content
        const maxLength = 200
        const truncated = content.length > maxLength 
          ? content.substring(0, maxLength) + '...' 
          : content
        eventLine += ` - ${truncated}`
      } else if (event.element.text) {
        // Fallback to element text
        const maxLength = 200
        const truncated = event.element.text.length > maxLength 
          ? event.element.text.substring(0, maxLength) + '...' 
          : event.element.text
        eventLine += ` - ${truncated}`
      }
      
      // Add stack trace info if available (only first line)
      if (event.stack) {
        const firstStackLine = event.stack.split('\n')[0]
        if (firstStackLine && firstStackLine.trim()) {
          eventLine += ` (${firstStackLine.trim()})`
        }
      }
    }
    
    if (event.element.text && event.type === 'click') {
      eventLine += ` text: "${event.element.text.substring(0, 50)}..."`
    }
    
    if (event.element.href) {
      eventLine += ` href: "${event.element.href}"`
    }
    
    return eventLine
  }

  // Handle screenshot preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  
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

  const handleDownload = async () => {
    try {
      const zip = new JSZip()
      const imageUrls: { [key: string]: string } = {}
      let imageCounter = 0
      
      // Generate markdown content for browser events
      let markdownContent = '# Browser Events Log\n\n'
      markdownContent += `Generated: ${new Date().toLocaleString()}\n\n`
      markdownContent += '## Browser Events\n\n'
      
      // Process each event
      for (const event of events) {
        const time = new Date(event.timestamp).toLocaleString()
        markdownContent += `### [${time}] ${event.type.toUpperCase()}\n\n`
        
        // Basic event information
        if (event.element.tagName) {
          markdownContent += `**Element**: \`<${event.element.tagName.toLowerCase()}`
          if (event.element.id) markdownContent += ` id="${event.element.id}"`
          if (event.element.className) markdownContent += ` class="${event.element.className}"`
          markdownContent += `>\`\n\n`
        }
        
        // Event-specific details
        if (event.type === 'click') {
          markdownContent += `**Position**: (${event.details.x}, ${event.details.y})\n\n`
        } else if (event.type === 'input') {
          markdownContent += `**Value**: "${event.details.value}"\n\n`
        } else if (event.type === 'keypress') {
          markdownContent += `**Key**: "${event.details.key}"`
          if (event.details.ctrlKey || event.details.shiftKey || event.details.altKey) {
            const modifiers = []
            if (event.details.ctrlKey) modifiers.push('Ctrl')
            if (event.details.shiftKey) modifiers.push('Shift')
            if (event.details.altKey) modifiers.push('Alt')
            markdownContent += ` (+ ${modifiers.join(' + ')})`
          }
          markdownContent += '\n\n'
        } else if (event.type === 'scroll') {
          markdownContent += `**Scroll Position**: (${event.details.scrollX}, ${event.details.scrollY})\n\n`
        } else if (event.type === 'submit') {
          const formData = event.details.formData?.map((item: any) => `${item.key}=${item.value}`).join(', ') || ''
          markdownContent += `**Form Data**: {${formData}}\n\n`
        } else if (event.type === 'screenshot') {
          const imageFilename = `screenshot_${++imageCounter}.png`
          markdownContent += `**Screenshot**: ${event.element.text}\n\n`
          markdownContent += `**Size**: ${event.details.width}x${event.details.height}\n\n`
          markdownContent += `![Screenshot](./images/${imageFilename})\n\n`
          
          // Extract and save image data
          if (event.details.imageData) {
            const base64Data = event.details.imageData.replace(/^data:image\/[a-z]+;base64,/, '')
            imageUrls[imageFilename] = base64Data
          }
        } else if (event.type === 'console') {
          const level = event.level || event.details?.level || 'log'
          markdownContent += `**Level**: ${level.toUpperCase()}\n\n`
          
          if (event.args && event.args.length > 0) {
            markdownContent += `**Message**: ${event.args.join(' ')}\n\n`
          } else if (event.element.text) {
            markdownContent += `**Message**: ${event.element.text}\n\n`
          }
          
          if (event.stack) {
            markdownContent += `**Stack Trace**:\n\`\`\`\n${event.stack}\n\`\`\`\n\n`
          }
        }
        
        // Additional information
        if (event.element.text && event.type === 'click') {
          const text = event.element.text.length > 100 
            ? event.element.text.substring(0, 100) + '...' 
            : event.element.text
          markdownContent += `**Text**: "${text}"\n\n`
        }
        
        if (event.element.href) {
          markdownContent += `**Link**: ${event.element.href}\n\n`
        }
        
        if (event.url) {
          markdownContent += `**URL**: ${event.url}\n\n`
        }
        
        markdownContent += '---\n\n'
      }
      
      // Add terminal logs section
      markdownContent += '## Terminal Logs\n\n'
      if (getTerminalContent) {
        try {
          const terminalData = getTerminalContent()
          if (terminalData && terminalData.trim()) {
            markdownContent += '```bash\n'
            markdownContent += terminalData
            markdownContent += '\n```\n\n'
          } else {
            markdownContent += '*No terminal output available.*\n\n'
          }
        } catch (err) {
          console.error('Failed to get terminal content:', err)
          markdownContent += '*Error retrieving terminal logs.*\n\n'
        }
      } else {
        markdownContent += '*Terminal log collection not available.*\n\n'
      }
      markdownContent += '---\n\n'
      markdownContent += `**Total Events**: ${events.length}\n`
      markdownContent += `**Report Generated**: ${new Date().toISOString()}\n`
      
      // Add markdown file to zip
      zip.file('report.md', markdownContent)
      
      // Add images to zip
      if (Object.keys(imageUrls).length > 0) {
        const imagesFolder = zip.folder('images')
        for (const [filename, base64Data] of Object.entries(imageUrls)) {
          if (imagesFolder) {
            imagesFolder.file(filename, base64Data, { base64: true })
          }
        }
      }
      
      // Generate and download zip file
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `browser-terminal-logs-${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (err) {
      console.error('Failed to generate download:', err)
      // Fallback to simple text download
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
          <div className="space-y-2">
            {events.map((event, index) => (
              <div key={event.id || index} className="flex items-start gap-3">
                <div className="flex-1">
                  <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {formatEvent(event)}
                  </pre>
                </div>
                {event.type === 'screenshot' && event.details?.imageData && (
                  <div className="flex-shrink-0">
                    <img
                      src={event.details.imageData}
                      alt="Screenshot"
                      className="w-16 h-12 object-cover border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewImage(event.details.imageData)}
                      title="Click to view full size"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Screenshot preview modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-4xl max-h-4xl p-4">
            <img
              src={previewImage}
              alt="Screenshot Preview"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      
      <div className="px-3 py-1 border-t text-xs text-gray-500">
        {events.length} events | {eventsText.length} characters | Last: {events.length > 0 ? new Date(events[events.length - 1].timestamp).toLocaleTimeString() : 'N/A'}
      </div>
    </Card>
  )
}