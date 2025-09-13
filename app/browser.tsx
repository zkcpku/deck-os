'use client'

import { Card } from '@/components/card'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, RefreshCw, Home, ExternalLink, Copy, Camera } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useBrowserEvents } from '@/store/browser-events'
import html2canvas from 'html2canvas'

interface BrowserProps {
  className?: string
  startUrl?: string | null
}

export function Browser({ className, startUrl }: BrowserProps) {
  const defaultUrl = startUrl || 'https://example.com'
  const [url, setUrl] = useState(defaultUrl)
  const [displayUrl, setDisplayUrl] = useState(defaultUrl)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [history, setHistory] = useState<string[]>([defaultUrl])
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
    setDisplayUrl(defaultUrl)
    loadUrl(defaultUrl)
  }

  const handleOpenExternal = () => {
    window.open(displayUrl, '_blank')
  }

  const handleCopyScreenshot = async () => {
    if (!iframeRef.current) return

    try {
      // Get the iframe document
      const iframe = iframeRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

      if (!iframeDoc) {
        throw new Error('Cannot access iframe content')
      }

      // Use html2canvas to capture the iframe content
      const canvas = await html2canvas(iframeDoc.body, {
        allowTaint: true,
        useCORS: true,
        scale: 1,
        width: iframe.clientWidth,
        height: iframe.clientHeight,
        backgroundColor: '#ffffff'
      })

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ])
            // Could add a toast notification here for success
          } catch (err) {
            console.error('Failed to copy screenshot:', err)
            // Fallback: download the image
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `browser-screenshot-${Date.now()}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }
        }
      }, 'image/png')
    } catch (err) {
      console.error('Failed to capture screenshot:', err)
    }
  }

  const handleRecordScreenshot = async () => {
    if (!iframeRef.current) return

    try {
      // Get the iframe document
      const iframe = iframeRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

      if (!iframeDoc) {
        throw new Error('Cannot access iframe content')
      }

      // Use html2canvas to capture the iframe content
      const canvas = await html2canvas(iframeDoc.body, {
        allowTaint: true,
        useCORS: true,
        scale: 1,
        width: iframe.clientWidth,
        height: iframe.clientHeight,
        backgroundColor: '#ffffff'
      })

      // Convert canvas to base64
      const base64Image = canvas.toDataURL('image/png')
      
      // Create a browser event for the screenshot
      const screenshotEvent = {
        id: `screenshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'screenshot',
        timestamp: new Date().toISOString(),
        element: {
          tagName: 'IFRAME',
          id: '',
          className: '',
          text: 'Browser screenshot',
          href: '',
          src: displayUrl
        },
        details: {
          imageData: base64Image,
          width: iframe.clientWidth,
          height: iframe.clientHeight,
          action: 'record'
        },
        url: displayUrl
      }

      // Add the event to the browser events store
      addEvent(screenshotEvent)
      
    } catch (err) {
      console.error('Failed to record screenshot:', err)
    }
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
          onClick={handleCopyScreenshot}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          title="Copy screenshot"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={handleRecordScreenshot}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          title="Record screenshot to events"
        >
          <Camera className="w-4 h-4" />
        </button>
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