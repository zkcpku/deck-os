import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import * as pty from 'node-pty'

// Routes
import filesRouter from './routes/files.js'
import proxyRouter from './routes/proxy.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = 3851

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../dist')))

// API Routes
app.use('/api/files', filesRouter)
app.use('/api/proxy', proxyRouter)

// Store active terminal sessions
const terminals = new Map()

// Handle WebSocket connections for terminal
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

  // Store the terminal session
  terminals.set(sessionId, terminal)

  // Forward PTY output to WebSocket
  terminal.onData((data) => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify({ type: 'data', data }))
    }
  })

  // Handle terminal exit
  terminal.onExit((exitCode) => {
    console.log(`Terminal ${sessionId} exited with code: ${exitCode}`)
    terminals.delete(sessionId)
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'exit', code: exitCode }))
    }
  })

  // Handle WebSocket messages
  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString())
      
      switch (parsed.type) {
        case 'data':
          terminal.write(parsed.data)
          break
          
        case 'resize':
          terminal.resize(parsed.cols || 80, parsed.rows || 24)
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
    const terminal = terminals.get(sessionId)
    if (terminal) {
      terminal.kill()
      terminals.delete(sessionId)
    }
  })

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error(`Terminal WebSocket error for ${sessionId}:`, error)
  })
}

// Catch all handler: serve the index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

// Create HTTP server
const server = createServer(app)

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/api/terminal/websocket'
})

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const sessionId = url.searchParams.get('sessionId') || 'default'
  
  handleWebSocket(ws, sessionId)
})

server.listen(port, () => {
  console.log(`> Server ready on http://localhost:${port}`)
})