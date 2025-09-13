'use client'

import { Card } from '@/components/card'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  className?: string
}

export function Terminal({ className }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const commandHistoryRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const cwdRef = useRef('/') // Use ref to avoid closure issues
  const [sessionId] = useState(() => Math.random().toString(36).substring(7))

  useEffect(() => {
    if (!terminalRef.current) return

    // Initialize terminal
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      scrollback: 10000, // Increase scrollback buffer
      smoothScrollDuration: 100, // Smooth scrolling
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

    // Get initial working directory
    fetch('/api/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'pwd', sessionId })
    }).then(res => res.json()).then(result => {
      if (result.stdout) {
        cwdRef.current = result.stdout.trim()
      }
      // Display initial prompt
      term.write(`\x1b[1;34m${cwdRef.current}\x1b[0m $ `)
      term.scrollToBottom()
    }).catch(() => {
      // Display initial prompt with default
      term.write(`\x1b[1;34m${cwdRef.current}\x1b[0m $ `)
      term.scrollToBottom()
    })
    
    // Execute command via API
    const executeCommand = async (command: string) => {
      if (!command.trim()) return
      
      // Add to history
      commandHistoryRef.current = [...commandHistoryRef.current, command]
      historyIndexRef.current = -1
      
      // Handle built-in commands
      if (command === 'clear') {
        term.clear()
        term.write(`\x1b[1;34m${cwdRef.current}\x1b[0m $ `)
        term.scrollToBottom()
        return
      }
      
      try {
        // Execute command via API (including cd)
        const response = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command, cwd: cwdRef.current, sessionId })
        })
        
        const result = await response.json()
        
        if (result.stdout) {
          term.write(result.stdout.replace(/\n/g, '\r\n'))
        }
        if (result.stderr) {
          term.write(`\x1b[31m${result.stderr.replace(/\n/g, '\r\n')}\x1b[0m`)
        }
        if (!result.success && !result.stdout && !result.stderr) {
          term.write(`\x1b[31mCommand failed: ${command}\x1b[0m\r\n`)
        }
        
        // Update cwd if changed (especially important for cd command)
        if (result.cwd && result.cwd !== cwdRef.current) {
          cwdRef.current = result.cwd // Update ref immediately
        }
        
      } catch (error: any) {
        term.write(`\x1b[31mError: ${error.message}\x1b[0m\r\n`)
      }
      
      term.write(`\x1b[1;34m${cwdRef.current}\x1b[0m $ `)
      
      // Scroll to bottom to ensure the latest output is visible
      term.scrollToBottom()
    }
    
    let currentLine = ''
    let cursorPosition = 0
    
    term.onData((data) => {
      // Handle special keys
      if (data === '\r') { // Enter key
        term.write('\r\n')
        executeCommand(currentLine)
        currentLine = ''
        cursorPosition = 0
      } else if (data === '\u007F') { // Backspace
        if (cursorPosition > 0) {
          currentLine = currentLine.slice(0, cursorPosition - 1) + currentLine.slice(cursorPosition)
          cursorPosition--
          term.write('\b')
          term.write(currentLine.slice(cursorPosition) + ' ')
          term.write('\b'.repeat(currentLine.length - cursorPosition + 1))
        }
      } else if (data === '\x1b[A') { // Up arrow - history
        if (historyIndexRef.current < commandHistoryRef.current.length - 1) {
          // Clear current line
          term.write('\r\x1b[K')
          term.write(`\x1b[1;34m${cwdRef.current}\x1b[0m $ `)
          
          historyIndexRef.current++
          const historicCommand = commandHistoryRef.current[commandHistoryRef.current.length - 1 - historyIndexRef.current]
          currentLine = historicCommand
          cursorPosition = historicCommand.length
          term.write(historicCommand)
        }
      } else if (data === '\x1b[B') { // Down arrow - history
        if (historyIndexRef.current > -1) {
          // Clear current line
          term.write('\r\x1b[K')
          term.write(`\x1b[1;34m${cwdRef.current}\x1b[0m $ `)
          
          historyIndexRef.current--
          if (historyIndexRef.current === -1) {
            currentLine = ''
            cursorPosition = 0
          } else {
            const historicCommand = commandHistoryRef.current[commandHistoryRef.current.length - historyIndexRef.current]
            currentLine = historicCommand
            cursorPosition = historicCommand.length
            term.write(historicCommand)
          }
        }
      } else if (data === '\x1b[C') { // Right arrow
        if (cursorPosition < currentLine.length) {
          cursorPosition++
          term.write(data)
        }
      } else if (data === '\x1b[D') { // Left arrow
        if (cursorPosition > 0) {
          cursorPosition--
          term.write(data)
        }
      } else if (data === '\x03') { // Ctrl+C
        term.write('^C\r\n')
        term.write(`\x1b[1;34m${cwdRef.current}\x1b[0m $ `)
        currentLine = ''
        cursorPosition = 0
      } else if (data >= ' ') { // Printable characters
        currentLine = currentLine.slice(0, cursorPosition) + data + currentLine.slice(cursorPosition)
        cursorPosition++
        term.write(data + currentLine.slice(cursorPosition))
        term.write('\b'.repeat(currentLine.length - cursorPosition))
      }
    })

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit()
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (xtermRef.current) {
        xtermRef.current.dispose()
      }
    }
  }, [sessionId])

  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-medium">Terminal</h3>
        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          Ready
        </span>
      </div>
      <div ref={terminalRef} className="flex-1 p-2 bg-[#1e1e1e] overflow-auto" />
    </Card>
  )
}