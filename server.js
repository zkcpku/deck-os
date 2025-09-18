import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer } from 'ws'
import * as pty from 'node-pty'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = process.env.PORT || 3017

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Store active terminal sessions
const terminals = new Map()

// Handle WebSocket connections
function handleWebSocket(ws, sessionId) {
  console.log(`Terminal WebSocket connected: ${sessionId}`)
  
  // Create a new PTY process
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash'
  const terminal = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: { ...process.env, TERM: 'xterm-256color' }
  })

  // Store the terminal session with metadata
  terminals.set(sessionId, {
    terminal,
    startTime: new Date(),
    shell,
    cwd: process.cwd(),
    commandBuffer: '',
    lastCommand: null
  })

  // Forward PTY output to WebSocket
  terminal.onData((data) => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify({ type: 'data', data }))
    }
  })

  // Handle terminal exit
  terminal.onExit((exitCode) => {
    console.log(`Terminal ${sessionId} exited with code: ${exitCode}`)
    const session = terminals.get(sessionId)
    if (session) {
      const executionTime = Date.now() - session.startTime.getTime()
      // Send enhanced exit information
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ 
          type: 'exit', 
          code: exitCode,
          executionTime,
          sessionId 
        }))
      }
    }
    terminals.delete(sessionId)
  })

  // Handle WebSocket messages
  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString())
      const session = terminals.get(sessionId)
      
      if (!session) return
      
      switch (parsed.type) {
        case 'data':
          // Track command input for command detection
          if (session) {
            if (parsed.data === '\r') {
              // Command executed - extract command from buffer
              const command = session.commandBuffer.trim()
              if (command) {
                session.lastCommand = {
                  command,
                  startTime: new Date(),
                  cwd: session.cwd
                }
                // Send command event back to frontend
                if (ws.readyState === 1) {
                  ws.send(JSON.stringify({
                    type: 'command',
                    command,
                    cwd: session.cwd,
                    timestamp: new Date().toISOString()
                  }))
                }
              }
              session.commandBuffer = ''
            } else if (parsed.data === '\u0003') {
              // Ctrl+C - clear command buffer
              session.commandBuffer = ''
            } else if (parsed.data.length === 1 && parsed.data.charCodeAt(0) >= 32) {
              // Printable character - add to command buffer
              session.commandBuffer += parsed.data
            }
          }
          
          // Forward input to PTY
          session.terminal.write(parsed.data)
          break
          
        case 'resize':
          // Handle terminal resize
          session.terminal.resize(parsed.cols || 80, parsed.rows || 24)
          break
          
        default:
          console.warn(`Unknown message type: ${parsed.type}`)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  })

  // Handle WebSocket close
  ws.on('close', () => {
    console.log(`Terminal WebSocket disconnected: ${sessionId}`)
    const session = terminals.get(sessionId)
    if (session) {
      session.terminal.kill()
      terminals.delete(sessionId)
    }
  })

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error(`Terminal WebSocket error for ${sessionId}:`, error)
  })
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server,
    path: '/api/terminal/websocket'
  })

  wss.on('connection', (ws, req) => {
    const url = parse(req.url, true)
    const sessionId = url.query.sessionId || 'default'
    
    handleWebSocket(ws, sessionId)
  })

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})