'use client'

import { useEffect, useRef, useState } from 'react'
import '@xterm/xterm/css/xterm.css'

export default function TerminalImpl() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('Initializing...')
  const [isConnected, setIsConnected] = useState(false)
  const [sessionId] = useState(() => Math.random().toString(36).substring(7))

  useEffect(() => {
    let isMounted = true
    
    const initTerminal = async () => {
      try {
        console.log('Starting terminal initialization...')
        setStatus('Loading XTerm...')

        // Dynamic import to ensure client-side loading
        const { Terminal } = await import('@xterm/xterm')
        const { FitAddon } = await import('@xterm/addon-fit')

        if (!isMounted) return

        console.log('XTerm modules loaded')
        setStatus('Creating terminal...')

        if (!terminalRef.current) {
          console.error('Terminal ref not available')
          setStatus('Error: Terminal ref not available')
          return
        }

        const term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          scrollback: 1000,
          theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#d4d4d4',
          }
        })

        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)

        console.log('Opening terminal in DOM...')
        term.open(terminalRef.current)

        console.log('Fitting terminal...')
        setTimeout(() => {
          try {
            fitAddon.fit()
            console.log('Terminal fitted, size:', term.cols, 'x', term.rows)
          } catch (error) {
            console.error('Error fitting terminal:', error)
          }
        }, 100)

        setStatus('Connecting to shell...')

        // Connect WebSocket
        const connectWebSocket = () => {
          console.log('Creating WebSocket connection...')
          const ws = new WebSocket(`ws://localhost:3701?sessionId=${sessionId}`)

          ws.onopen = () => {
            console.log('WebSocket connected!')
            setIsConnected(true)
            setStatus('Connected')
            term.write('Terminal ready!\r\n')
          }

          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data)
              
              switch (message.type) {
                case 'data':
                  term.write(message.data)
                  break
                case 'ready':
                  console.log('PTY ready')
                  break
                case 'error':
                  console.error('PTY error:', message.message)
                  term.write(`\r\nError: ${message.message}\r\n`)
                  break
                case 'exit':
                  term.write(`\r\nProcess exited with code ${message.exitCode}\r\n`)
                  break
              }
            } catch (error) {
              console.error('Error parsing message:', error)
            }
          }

          ws.onerror = (error) => {
            console.error('WebSocket error:', error)
            setIsConnected(false)
            setStatus('Connection error')
            term.write('\r\nWebSocket error. Retrying...\r\n')
          }

          ws.onclose = () => {
            console.log('WebSocket closed')
            setIsConnected(false)
            setStatus('Disconnected')
            
            setTimeout(() => {
              if (isMounted) {
                console.log('Reconnecting...')
                connectWebSocket()
              }
            }, 3000)
          }

          // Handle terminal input
          term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'input', data }))
            }
          })

          return ws
        }

        const ws = connectWebSocket()

        // Cleanup function
        return () => {
          console.log('Cleaning up terminal...')
          isMounted = false
          if (ws) ws.close()
          if (term) term.dispose()
        }

      } catch (error) {
        console.error('Error initializing terminal:', error)
        setStatus(`Error: ${error.message}`)
      }
    }

    initTerminal()

    return () => {
      isMounted = false
    }
  }, [sessionId])

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between px-3 py-1 border-b bg-muted/50">
        <span className="text-xs text-muted-foreground">Session: {sessionId}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${
          isConnected 
            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
        }`}>
          {status}
        </span>
      </div>
      <div 
        ref={terminalRef} 
        className="flex-1 p-2 bg-[#1e1e1e]" 
        style={{ minHeight: '400px' }}
      />
    </div>
  )
}