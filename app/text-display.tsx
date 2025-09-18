'use client'

import { Card } from '@/components/card'
import { cn } from '@/lib/utils'
import { Copy, Download, Trash2, Activity, Terminal, Folder, Globe, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useEvents, BrowserEvent, TerminalEvent, FileEvent } from '@/store/events'
import JSZip from 'jszip'

interface TextDisplayProps {
  className?: string
  getTerminalContent?: () => string
}

export function TextDisplay({ className, getTerminalContent }: TextDisplayProps) {
  const { events, clearEvents, getEventsByType } = useEvents()
  const [autoScroll, setAutoScroll] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'all' | 'browser' | 'terminal' | 'file'>('all')
  const [aiSummary, setAiSummary] = useState<{
    summary: string
    insights: string[]
    eventCount: number
    isLoading: boolean
    error: string | null
    isVisible: boolean
  }>({
    summary: '',
    insights: [],
    eventCount: 0,
    isLoading: false,
    error: null,
    isVisible: false
  })
  
  // Get events by type
  const browserEvents = getEventsByType('browser') as BrowserEvent[]
  const terminalEvents = getEventsByType('terminal') as TerminalEvent[]
  const fileEvents = getEventsByType('file') as FileEvent[]
  
  // Get filtered events based on selected tab
  const getDisplayEvents = () => {
    switch (selectedTab) {
      case 'browser': return browserEvents
      case 'terminal': return terminalEvents
      case 'file': return fileEvents
      default: return events
    }
  }
  
  // Format events for display
  const formatEvent = (event: BrowserEvent | TerminalEvent | FileEvent) => {
    const time = new Date(event.timestamp).toLocaleTimeString()
    
    if (event.eventType === 'browser') {
      const browserEvent = event as BrowserEvent
      let eventLine = `[${time}] BROWSER ${browserEvent.type.toUpperCase()}`
      
      if (browserEvent.element?.tagName) {
        eventLine += ` - <${browserEvent.element.tagName.toLowerCase()}`
        if (browserEvent.element.id) eventLine += ` id="${browserEvent.element.id}"`
        if (browserEvent.element.className) eventLine += ` class="${browserEvent.element.className}"`
        eventLine += `>`
      }
      
      if (browserEvent.type === 'click') {
        eventLine += ` at (${browserEvent.details?.x}, ${browserEvent.details?.y})`
      } else if (browserEvent.type === 'input') {
        eventLine += ` value: "${browserEvent.details?.value}"`
      } else if (browserEvent.type === 'keypress') {
        eventLine += ` key: "${browserEvent.details?.key}"`
        if (browserEvent.details?.ctrlKey) eventLine += ' +Ctrl'
        if (browserEvent.details?.shiftKey) eventLine += ' +Shift'
        if (browserEvent.details?.altKey) eventLine += ' +Alt'
      } else if (browserEvent.type === 'scroll') {
        eventLine += ` to (${browserEvent.details?.scrollX}, ${browserEvent.details?.scrollY})`
      } else if (browserEvent.type === 'submit') {
        const formData = browserEvent.details?.formData?.map((item: any) => `${item.key}=${item.value}`).join(', ') || ''
        eventLine += ` data: {${formData}}`
      } else if (browserEvent.type === 'screenshot') {
        eventLine += ` - ${browserEvent.element?.text}`
        eventLine += ` size: ${browserEvent.details?.width}x${browserEvent.details?.height}`
      } else if (browserEvent.type === 'console') {
        const level = browserEvent.level || browserEvent.details?.level || 'log'
        eventLine += ` [${level.toUpperCase()}] `
        const args = browserEvent.args || browserEvent.details?.args || []
        const message = args.join(' ') || browserEvent.details?.message || ''
        eventLine += message.length > 200 ? message.slice(0, 200) + '...' : message
      }
      
      return eventLine
    }
    
    if (event.eventType === 'terminal') {
      const terminalEvent = event as TerminalEvent
      let eventLine = `[${time}] TERMINAL ${terminalEvent.type.toUpperCase()}`
      
      if (terminalEvent.sessionId) {
        eventLine += ` [${terminalEvent.sessionId}]`
      }
      
      if (terminalEvent.type === 'command') {
        eventLine += ` - "${terminalEvent.details.command}"`
        if (terminalEvent.details.workingDirectory) {
          eventLine += ` (${terminalEvent.details.workingDirectory})`
        }
      } else if (terminalEvent.type === 'output') {
        eventLine += ` - ${terminalEvent.details.outputLength} bytes`
        if (terminalEvent.details.output) {
          eventLine += `: "${terminalEvent.details.output}"`
        }
      } else if (terminalEvent.type === 'input') {
        eventLine += ` - "${terminalEvent.details.inputKey}"`
      } else if (terminalEvent.type === 'session') {
        if (terminalEvent.details.exitCode !== undefined) {
          eventLine += ` - EXIT (code: ${terminalEvent.details.exitCode})`
          if (terminalEvent.details.executionTime) {
            eventLine += ` after ${Math.round(terminalEvent.details.executionTime / 1000)}s`
          }
        } else {
          eventLine += ` - START (${terminalEvent.details.shellType})`
        }
      }
      
      return eventLine
    }
    
    if (event.eventType === 'file') {
      const fileEvent = event as FileEvent
      let eventLine = `[${time}] FILE ${fileEvent.type.toUpperCase()}`
      
      if (fileEvent.type === 'navigation') {
        eventLine += ` - ${fileEvent.details.targetPath}`
      } else if (fileEvent.type === 'operation') {
        eventLine += ` - ${fileEvent.details.operation?.toUpperCase()}`
        if (fileEvent.details.fileName) {
          eventLine += ` "${fileEvent.details.fileName}"`
        }
        if (fileEvent.details.sourcePath) {
          eventLine += ` from ${fileEvent.details.sourcePath}`
        }
        if (fileEvent.details.targetPath) {
          eventLine += ` to ${fileEvent.details.targetPath}`
        }
        if (fileEvent.details.success !== undefined) {
          eventLine += ` - ${fileEvent.details.success ? 'SUCCESS' : 'FAILED'}`
          if (fileEvent.details.error) {
            eventLine += ` (${fileEvent.details.error})`
          }
        }
      } else if (fileEvent.type === 'selection') {
        eventLine += ` - ${fileEvent.details.selectionCount} item(s)`
        if (fileEvent.details.sourcePath) {
          eventLine += ` including ${fileEvent.details.sourcePath.split('/').pop()}`
        }
      } else if (fileEvent.type === 'edit') {
        eventLine += ` - ${fileEvent.details.editAction?.toUpperCase()}`
        if (fileEvent.details.sourcePath) {
          eventLine += ` ${fileEvent.details.sourcePath.split('/').pop()}`
        }
        if (fileEvent.details.fileSize) {
          eventLine += ` (${fileEvent.details.fileSize} bytes)`
        }
      } else if (fileEvent.type === 'upload') {
        eventLine += ` - ${fileEvent.details.uploadStatus?.toUpperCase()}`
        if (fileEvent.details.fileName) {
          eventLine += ` "${fileEvent.details.fileName}"`
        }
      }
      
      return eventLine
    }
    
    return `[${time}] UNKNOWN EVENT`
  }

  // Handle screenshot preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  
  const displayEvents = getDisplayEvents()
  const eventsText = displayEvents.map(formatEvent).join('\n')
  
  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll) {
      const container = document.querySelector('.event-container')
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }
  }, [displayEvents, autoScroll])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(eventsText)
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
      
      // Generate markdown content
      let markdownContent = '# System Events Log\n\n'
      markdownContent += `Generated: ${new Date().toLocaleString()}\n\n`
      
      // Browser Events
      if (browserEvents.length > 0) {
        markdownContent += '## Browser Events\n\n'
        browserEvents.forEach(event => {
          const time = new Date(event.timestamp).toLocaleString()
          markdownContent += `### [${time}] ${event.type.toUpperCase()}\n\n`
          markdownContent += formatEvent(event) + '\n\n---\n\n'
        })
      }
      
      // Terminal Events
      if (terminalEvents.length > 0) {
        markdownContent += '## Terminal Events\n\n'
        terminalEvents.forEach(event => {
          const time = new Date(event.timestamp).toLocaleString()
          markdownContent += `### [${time}] ${event.type.toUpperCase()}\n\n`
          markdownContent += formatEvent(event) + '\n\n---\n\n'
        })
      }
      
      // File Events
      if (fileEvents.length > 0) {
        markdownContent += '## File Events\n\n'
        fileEvents.forEach(event => {
          const time = new Date(event.timestamp).toLocaleString()
          markdownContent += `### [${time}] ${event.type.toUpperCase()}\n\n`
          markdownContent += formatEvent(event) + '\n\n---\n\n'
        })
      }
      
      // Terminal logs
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
          markdownContent += '*Error retrieving terminal logs.*\n\n'
        }
      }
      
      markdownContent += `**Total Events**: ${events.length}\n`
      markdownContent += `**Browser Events**: ${browserEvents.length}\n`
      markdownContent += `**Terminal Events**: ${terminalEvents.length}\n`
      markdownContent += `**File Events**: ${fileEvents.length}\n`
      markdownContent += `**Report Generated**: ${new Date().toISOString()}\n`
      
      // Add markdown file to zip
      zip.file('events-report.md', markdownContent)
      
      // Generate and download zip file
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `system-events-${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (err) {
      console.error('Failed to generate download:', err)
    }
  }

  const handleAiSummary = async () => {
    const currentEvents = getDisplayEvents()
    
    if (currentEvents.length === 0) {
      setAiSummary(prev => ({ 
        ...prev, 
        error: 'No events to summarize',
        isVisible: true 
      }))
      return
    }

    setAiSummary(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      isVisible: true 
    }))

    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: currentEvents,
          eventType: selectedTab,
          includeImages: selectedTab === 'browser' || selectedTab === 'all'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate summary')
      }

      const data = await response.json()
      setAiSummary(prev => ({
        ...prev,
        summary: data.summary,
        insights: data.insights || [],
        eventCount: data.eventCount,
        isLoading: false,
        error: null
      }))
    } catch (error: any) {
      setAiSummary(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to generate AI summary'
      }))
    }
  }

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'browser': return <Globe className="w-4 h-4" />
      case 'terminal': return <Terminal className="w-4 h-4" />
      case 'file': return <Folder className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'browser': return 'Browser Events'
      case 'terminal': return 'Terminal Events'
      case 'file': return 'File Events'
      default: return 'All Events'
    }
  }

  const getEventCount = (tab: string) => {
    switch (tab) {
      case 'browser': return browserEvents.length
      case 'terminal': return terminalEvents.length
      case 'file': return fileEvents.length
      default: return events.length
    }
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-4">
          {/* Tab buttons */}
          <div className="flex gap-1">
            {(['all', 'browser', 'terminal', 'file'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 text-xs rounded",
                  selectedTab === tab
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}
              >
                {getTabIcon(tab)}
                <span>{getTabTitle(tab)}</span>
                <span className="ml-1 text-xs opacity-60">({getEventCount(tab)})</span>
              </button>
            ))}
          </div>
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
              onClick={handleAiSummary}
              disabled={aiSummary.isLoading || getDisplayEvents().length === 0}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generate AI Summary"
            >
              <Sparkles className={cn("w-4 h-4", aiSummary.isLoading && "animate-pulse")} />
            </button>
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
      
      {/* AI Summary Panel */}
      {aiSummary.isVisible && (
        <div className="border-b bg-blue-50 dark:bg-blue-950">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                AI Summary {aiSummary.eventCount > 0 && `(${aiSummary.eventCount} events)`}
              </span>
            </div>
            <button
              onClick={() => setAiSummary(prev => ({ ...prev, isVisible: false }))}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          
          <div className="px-3 pb-3 max-h-64 overflow-y-auto">
            {aiSummary.isLoading && (
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <Sparkles className="w-4 h-4 animate-pulse" />
                Analyzing events with AI...
              </div>
            )}
            
            {aiSummary.error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900 p-2 rounded">
                {aiSummary.error}
              </div>
            )}
            
            {aiSummary.summary && !aiSummary.isLoading && (
              <div className="space-y-3">
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-white dark:bg-gray-800 p-3 rounded border max-h-48 overflow-y-auto">
                  {aiSummary.summary}
                </div>
                
                {aiSummary.insights.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Key Insights:</h4>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 max-h-32 overflow-y-auto">
                      {aiSummary.insights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex-1 p-3 overflow-auto event-container">
        {displayEvents.length === 0 ? (
          <div className="text-gray-500 text-sm text-center mt-8">
            {getTabIcon(selectedTab)}
            <div className="mt-2">
              <p>No {selectedTab === 'all' ? '' : selectedTab + ' '}events captured yet.</p>
              <p className="text-xs mt-1">
                {selectedTab === 'browser' && 'Navigate and interact with the browser to see events here.'}
                {selectedTab === 'terminal' && 'Use the terminal to see command events here.'}
                {selectedTab === 'file' && 'Use the file manager to see file operation events here.'}
                {selectedTab === 'all' && 'Use the browser, terminal, or file manager to see events here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {displayEvents.map((event, index) => (
              <div key={event.id || index} className="flex items-start gap-3">
                <div className="flex-1">
                  <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {formatEvent(event)}
                  </pre>
                </div>
                {event.eventType === 'browser' && 
                 (event as BrowserEvent).type === 'screenshot' && 
                 (event as BrowserEvent).details?.imageData && (
                  <div className="flex-shrink-0">
                    <img
                      src={(event as BrowserEvent).details.imageData}
                      alt="Screenshot"
                      className="w-16 h-12 object-cover border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewImage((event as BrowserEvent).details.imageData)}
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
        {getEventCount(selectedTab)} events | {eventsText.length} characters | 
        Last: {displayEvents.length > 0 ? new Date(displayEvents[displayEvents.length - 1].timestamp).toLocaleTimeString() : 'N/A'}
      </div>
    </Card>
  )
}