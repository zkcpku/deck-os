'use client'

import { Card } from '@/components/card'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, RefreshCw, Home, ExternalLink } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useBrowserEvents } from '@/store/browser-events'

interface BrowserProps {
  className?: string
}

export function Browser({ className }: BrowserProps) {
  const [url, setUrl] = useState('https://example.com')
  const [displayUrl, setDisplayUrl] = useState('https://example.com')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [history, setHistory] = useState<string[]>(['https://example.com'])
  const [historyIndex, setHistoryIndex] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { addEvent } = useBrowserEvents()

  const loadUrl = async (targetUrl: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Use proxy API to fetch content
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to load page')
      }
      
      const html = await response.text()
      setContent(html)
      setDisplayUrl(targetUrl)
      
      // Update history
      if (history[historyIndex] !== targetUrl) {
        const newHistory = [...history.slice(0, historyIndex + 1), targetUrl]
        setHistory(newHistory)
        setHistoryIndex(newHistory.length - 1)
      }
      
    } catch (err: any) {
      setError(err.message)
      setContent(`
        <html>
          <body style="font-family: system-ui; padding: 20px;">
            <h2>Error Loading Page</h2>
            <p>${err.message}</p>
            <p>URL: ${targetUrl}</p>
          </body>
        </html>
      `)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUrl(url)
  }, [])

  // Set up message listener for browser events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the message is from our iframe
      if (event.data?.type === 'browser-event') {
        addEvent(event.data.data)
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [addEvent]) // Restore addEvent dependency now that we have ID-based deduplication

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault()
    loadUrl(displayUrl)
  }

  const handleRefresh = () => {
    loadUrl(displayUrl)
  }

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setDisplayUrl(history[newIndex])
      loadUrl(history[newIndex])
    }
  }

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setDisplayUrl(history[newIndex])
      loadUrl(history[newIndex])
    }
  }

  const handleHome = () => {
    const homeUrl = 'https://example.com'
    setDisplayUrl(homeUrl)
    loadUrl(homeUrl)
  }

  const handleOpenExternal = () => {
    window.open(displayUrl, '_blank')
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-2 p-2 border-b">
        <button
          onClick={handleBack}
          disabled={historyIndex === 0}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleForward}
          disabled={historyIndex >= history.length - 1}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="Forward"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleRefresh}
          className={cn(
            "p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded",
            isLoading && "animate-spin"
          )}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={handleHome}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          title="Home"
        >
          <Home className="w-4 h-4" />
        </button>
        <form onSubmit={handleNavigate} className="flex-1 flex gap-2">
          <input
            type="text"
            value={displayUrl}
            onChange={(e) => setDisplayUrl(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter URL..."
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
          >
            Go
          </button>
        </form>
        <button
          onClick={handleOpenExternal}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 relative overflow-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        )}
        {error && (
          <div className="absolute top-0 left-0 right-0 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 text-sm z-10">
            {error}
          </div>
        )}
        <iframe
          ref={iframeRef}
          srcDoc={content}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Browser"
        />
      </div>
    </Card>
  )
}