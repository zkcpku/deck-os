import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

// Store session working directories
const sessions = new Map<string, string>()

export async function POST(request: NextRequest) {
  try {
    const { command, cwd: requestCwd, sessionId = 'default' } = await request.json()
    
    if (!command) {
      return NextResponse.json(
        { error: 'Command is required' },
        { status: 400 }
      )
    }
    
    // Get current working directory for this session
    let cwd = sessions.get(sessionId) || requestCwd || process.cwd()
    
    // Security: Basic command sanitization
    const dangerousCommands = ['rm -rf /', 'format', 'del /f', 'dd if=']
    if (dangerousCommands.some(cmd => command.includes(cmd))) {
      return NextResponse.json(
        { error: 'Command not allowed' },
        { status: 403 }
      )
    }
    
    // Handle cd command specially
    if (command.startsWith('cd ')) {
      const targetDir = command.substring(3).trim()
      let newCwd = targetDir
      
      // Handle special paths
      if (targetDir === '~') {
        newCwd = process.env.HOME || '/'
      } else if (targetDir === '-') {
        // cd - (go to previous directory) - simplified implementation
        newCwd = cwd
      } else if (!path.isAbsolute(targetDir)) {
        // Relative path
        newCwd = path.resolve(cwd, targetDir)
      }
      
      try {
        // Verify the directory exists
        const stats = await fs.stat(newCwd)
        if (!stats.isDirectory()) {
          return NextResponse.json({
            success: false,
            stdout: '',
            stderr: `cd: ${targetDir}: Not a directory`,
            cwd
          })
        }
        
        // Update session working directory
        sessions.set(sessionId, newCwd)
        
        return NextResponse.json({
          success: true,
          stdout: '',
          stderr: '',
          cwd: newCwd
        })
        
      } catch (error: any) {
        return NextResponse.json({
          success: false,
          stdout: '',
          stderr: `cd: ${targetDir}: No such file or directory`,
          cwd
        })
      }
    }
    
    try {
      // For other commands, execute with current working directory
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 10,
        env: { ...process.env, FORCE_COLOR: '0', PWD: cwd }
      })
      
      // If command changes directory (unlikely but possible), detect it
      if (command === 'pwd') {
        const pwdOutput = stdout.trim()
        if (pwdOutput && pwdOutput !== cwd) {
          sessions.set(sessionId, pwdOutput)
          cwd = pwdOutput
        }
      }
      
      return NextResponse.json({
        success: true,
        stdout: stdout || '',
        stderr: stderr || '',
        cwd
      })
      
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code,
        cwd
      })
    }
    
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to execute command: ${error.message}` },
      { status: 500 }
    )
  }
}