#!/usr/bin/env node

const WebSocket = require('ws');

console.log('Testing WebSocket connection to localhost:3701...');

const ws = new WebSocket('ws://localhost:3701?sessionId=test123');

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  
  // Send a test input
  setTimeout(() => {
    console.log('Sending test command: ls');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'ls\r'
    }));
  }, 1000);
  
  // Close after 5 seconds
  setTimeout(() => {
    console.log('Closing connection...');
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('📨 Received:', message.type, message.data ? `"${message.data.substring(0, 50)}..."` : '');
  } catch (e) {
    console.log('📨 Raw data:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');
  process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout');
  process.exit(1);
}, 10000);