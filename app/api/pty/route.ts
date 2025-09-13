import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'PTY WebSocket endpoint. Use WebSocket connection on ws://localhost:3701',
    status: 'available'
  })
}