#!/usr/bin/env node

const { WebSocketServer } = require('ws')
const pty = require('node-pty')
const os = require('os')

// Store active PTY sessions
const sessions = new Map()
// Store WebSocket connections per session
const connections = new Map()

const wss = new WebSocketServer({ 
  port: 3701,
  // Add some configuration to improve stability
  perMessageDeflate: false,
  maxPayload: 1024 * 1024 * 10, // 10MB
})

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection')
  
  // Extract session ID from query parameters
  const url = new URL(req.url, `http://${req.headers.host}`)
  const sessionId = url.searchParams.get('sessionId') || 'default'
  
  // Store this connection
  if (!connections.has(sessionId)) {
    connections.set(sessionId, new Set())
  }
  connections.get(sessionId).add(ws)
  
  // Check if session already exists
  let ptyProcess = sessions.get(sessionId)
  
  if (!ptyProcess) {
    // Create new PTY process
    const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'
    
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          SHELL: process.env.SHELL || '/bin/bash',
          HOME: process.env.HOME,
          USER: process.env.USER,
          PATH: process.env.PATH,
          LANG: process.env.LANG || 'en_US.UTF-8',
        }
      })
      
      sessions.set(sessionId, ptyProcess)
      
      // Handle PTY output - broadcast to all connections for this session
      ptyProcess.onData((data) => {
        const sessionConnections = connections.get(sessionId)
        if (sessionConnections) {
          sessionConnections.forEach(conn => {
            if (conn.readyState === conn.OPEN) {
              conn.send(JSON.stringify({ type: 'data', data }))
            }
          })
        }
      })
      
      // Handle PTY exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`PTY process exited with code ${exitCode}`)
        sessions.delete(sessionId)
        
        const sessionConnections = connections.get(sessionId)
        if (sessionConnections) {
          sessionConnections.forEach(conn => {
            if (conn.readyState === conn.OPEN) {
              conn.send(JSON.stringify({ type: 'exit', exitCode, signal }))
            }
          })
        }
      })
      
      console.log(`Created new PTY session: ${sessionId}`)
    } catch (error) {
      console.error('Error creating PTY process:', error)
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to create shell process' }))
      return
    }
  }
  
  // Handle WebSocket messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())
      
      switch (data.type) {
        case 'input':
          if (ptyProcess) {
            ptyProcess.write(data.data)
          }
          break
        case 'resize':
          if (ptyProcess && data.cols && data.rows) {
            try {
              ptyProcess.resize(data.cols, data.rows)
            } catch (error) {
              console.error('Error resizing PTY:', error)
            }
          }
          break
        default:
          console.log('Unknown message type:', data.type)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  })
  
  // Handle WebSocket close
  ws.on('close', () => {
    console.log('WebSocket connection closed')
    
    // Remove this connection from the session
    const sessionConnections = connections.get(sessionId)
    if (sessionConnections) {
      sessionConnections.delete(ws)
      
      // If no more connections for this session, we could optionally clean up
      // For now, keep the PTY session alive for potential reconnection
      if (sessionConnections.size === 0) {
        // Optional: kill PTY after some time if no reconnection
        // setTimeout(() => {
        //   if (sessionConnections.size === 0) {
        //     const pty = sessions.get(sessionId)
        //     if (pty) {
        //       pty.kill()
        //       sessions.delete(sessionId)
        //       connections.delete(sessionId)
        //     }
        //   }
        // }, 30000) // 30 seconds
      }
    }
  })
  
  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
  
  // Send initial ready message
  ws.send(JSON.stringify({ type: 'ready' }))
})

wss.on('error', (error) => {
  console.error('WebSocket server error:', error)
})

console.log('PTY WebSocket server started on port 3701')

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down PTY WebSocket server...')
  
  // Kill all PTY processes
  for (const [sessionId, ptyProcess] of sessions) {
    console.log(`Killing PTY session: ${sessionId}`)
    ptyProcess.kill()
  }
  
  // Close WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})