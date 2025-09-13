'use client'

import { Card } from '@/components/card'
import { cn } from '@/lib/utils'
import { Copy } from 'lucide-react'
import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  className?: string
  startCommand?: string | null
}

export interface TerminalRef {
  getTerminalContent: () => string
}

export const Terminal = forwardRef<TerminalRef, TerminalProps>(({ className, startCommand }, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)
  const fitAddonRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [sessionId] = useState(() => Math.random().toString(36).substring(7))
  const [isConnected, setIsConnected] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getTerminalContent: () => {
      if (!xtermRef.current) return ''

      try {
        const term = xtermRef.current
        
        // Method 1: Use selectAll and getSelection for most reliable results
        term.selectAll()
        const selection = term.getSelection()
        term.clearSelection()
        
        if (selection && selection.trim()) {
          // Clean up the content: remove excessive empty lines and clean formatting
          const cleanedContent = selection
            .replace(/\r\n/g, '\n')  // Normalize line endings
            .replace(/\n\s*\n\s*\n/g, '\n\n')  // Remove excessive empty lines
            .trim()
          
          return cleanedContent
        }
        
        // Method 2: Fallback to manual buffer reading if selection fails
        let terminalContent = ''
        const buffer = term.buffer.normal
        const scrollbackSize = buffer.length
        const viewportSize = term.rows
        
        // Get scrollback content first
        for (let i = 0; i < scrollbackSize; i++) {
          const line = buffer.getLine(i)
          if (line) {
            terminalContent += line.translateToString(true) + '\n'
          }
        }
        
        // Then get current viewport content
        for (let i = 0; i < viewportSize; i++) {
          const line = buffer.getLine(scrollbackSize + i)
          if (line) {
            terminalContent += line.translateToString(true) + '\n'
          }
        }
        
        // Clean up the content
        terminalContent = terminalContent
          .replace(/\r\n/g, '\n')
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .trim()
        
        return terminalContent
        
      } catch (err) {
        console.error('Failed to get terminal content:', err)
        return ''
      }
    }
  }))

  useEffect(() => {
    // Dynamically import xterm modules only on client side
    const loadTerminal = async () => {
      try {
        const { Terminal: XTerm } = await import('@xterm/xterm')
        const { FitAddon } = await import('@xterm/addon-fit')
        
        if (!terminalRef.current) return

        // Initialize terminal
        const term = new XTerm({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          scrollback: 10000,
          smoothScrollDuration: 100,
          theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#d4d4d4',
            black: '#000000',
            red: '#cd3131',
            green: '#0dbc79',
            yellow: '#e5e510',
            blue: '#2472c8',
            magenta: '#bc3fbc',
            cyan: '#11a8cd',
            white: '#e5e5e5',
            brightBlack: '#666666',
            brightRed: '#f14c4c',
            brightGreen: '#23d18b',
            brightYellow: '#f5f543',
            brightBlue: '#3b8eea',
            brightMagenta: '#d670d6',
            brightCyan: '#29b8db',
            brightWhite: '#e5e5e5'
          }
        })

        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)
        
        term.open(terminalRef.current)
        fitAddon.fit()

        xtermRef.current = term
        fitAddonRef.current = fitAddon

        // Connect to WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${protocol}//${window.location.host}/api/terminal/websocket?sessionId=${sessionId}`
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('Terminal WebSocket connected')
          setIsConnected(true)
          
          // Send initial resize
          ws.send(JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows
          }))
          
          // Send initial command if provided
          if (startCommand) {
            setTimeout(() => {
              ws.send(JSON.stringify({ 
                type: 'data', 
                data: startCommand + '\r' 
              }))
            }, 100) // Small delay to ensure terminal is ready
          }
        }

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            
            switch (message.type) {
              case 'data':
                term.write(message.data)
                break
                
              case 'exit':
                term.write(`\r\n\x1b[31mProcess exited with code: ${message.code}\x1b[0m\r\n`)
                setIsConnected(false)
                break
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        ws.onclose = () => {
          console.log('Terminal WebSocket disconnected')
          setIsConnected(false)
        }

        ws.onerror = (error) => {
          console.error('Terminal WebSocket error:', error)
          setIsConnected(false)
        }

        // Forward terminal input to WebSocket
        term.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'data', data }))
          }
        })

        // Handle window resize
        const handleResize = () => {
          if (fitAddonRef.current) {
            fitAddonRef.current.fit()
            
            // Send resize to backend
            if (ws.readyState === WebSocket.OPEN && xtermRef.current) {
              ws.send(JSON.stringify({
                type: 'resize',
                cols: xtermRef.current.cols,
                rows: xtermRef.current.rows
              }))
            }
          }
        }
        window.addEventListener('resize', handleResize)

        setIsLoaded(true)

        return () => {
          window.removeEventListener('resize', handleResize)
          if (wsRef.current) {
            wsRef.current.close()
          }
          if (xtermRef.current) {
            xtermRef.current.dispose()
          }
        }
      } catch (error) {
        console.error('Failed to load terminal:', error)
      }
    }

    loadTerminal()
  }, [sessionId])

  const handleCopyTerminal = async () => {
    if (!xtermRef.current) return

    try {
      const term = xtermRef.current
      
      // Method 1: Use selectAll and getSelection for most reliable results
      term.selectAll()
      const selection = term.getSelection()
      term.clearSelection()
      
      if (selection && selection.trim()) {
        // Clean up the content: remove excessive empty lines and clean formatting
        const cleanedContent = selection
          .replace(/\r\n/g, '\n')  // Normalize line endings
          .replace(/\n\s*\n\s*\n/g, '\n\n')  // Remove excessive empty lines
          .trim()
        
        await navigator.clipboard.writeText(cleanedContent)
        return
      }
      
      // Method 2: Fallback to manual buffer reading if selection fails
      let terminalContent = ''
      const buffer = term.buffer.normal
      const scrollbackSize = buffer.length
      const viewportSize = term.rows
      
      // Get scrollback content first
      for (let i = 0; i < scrollbackSize; i++) {
        const line = buffer.getLine(i)
        if (line) {
          terminalContent += line.translateToString(true) + '\n'
        }
      }
      
      // Then get current viewport content
      for (let i = 0; i < viewportSize; i++) {
        const line = buffer.getLine(scrollbackSize + i)
        if (line) {
          terminalContent += line.translateToString(true) + '\n'
        }
      }
      
      // Clean up the content
      terminalContent = terminalContent
        .replace(/\r\n/g, '\n')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim()
      
      await navigator.clipboard.writeText(terminalContent)
      
    } catch (err) {
      console.error('Failed to copy terminal content:', err)
    }
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-medium">Terminal</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyTerminal}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Copy terminal content"
          >
            <Copy className="w-4 h-4" />
          </button>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded",
            isConnected 
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
          )}>
            {!isLoaded ? 'Loading...' : isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 p-2 bg-[#1e1e1e] overflow-auto" />
    </Card>
  )
})

Terminal.displayName = 'Terminal'