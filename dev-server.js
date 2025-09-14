#!/usr/bin/env node

import { spawn } from 'child_process'
import path from 'path'

// 简单的并发运行脚本，替换concurrently
function runConcurrently(commands) {
  const processes = commands.map((cmd, index) => {
    const [command, ...args] = cmd.split(' ')
    const proc = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      cwd: process.cwd()
    })
    
    // 给每个进程加上前缀
    const prefix = `[${index}]`
    
    proc.stdout.on('data', (data) => {
      process.stdout.write(`${prefix} ${data}`)
    })
    
    proc.stderr.on('data', (data) => {
      process.stderr.write(`${prefix} ${data}`)
    })
    
    proc.on('close', (code) => {
      console.log(`${prefix} ${command} exited with code ${code}`)
      if (code !== 0) {
        // 如果一个进程失败，杀死其他进程
        processes.forEach(p => {
          if (p !== proc && !p.killed) {
            p.kill('SIGTERM')
          }
        })
        process.exit(code)
      }
    })
    
    return proc
  })
  
  // 处理 Ctrl+C
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, killing all processes...')
    processes.forEach(proc => {
      if (!proc.killed) {
        proc.kill('SIGTERM')
      }
    })
    process.exit(0)
  })
}

// 运行开发服务器
runConcurrently(['vite', 'node server/index.js'])