#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

console.log('🔧 Running postinstall script...')

// 查找 node-pty 模块路径
function findNodePtyPath() {
  const possiblePaths = [
    join(projectRoot, 'node_modules', 'node-pty'),
    join(projectRoot, 'node_modules', '.pnpm', 'node-pty@1.0.0', 'node_modules', 'node-pty')
  ]
  
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path
    }
  }
  
  return null
}

// 重建 node-pty
function rebuildNodePty() {
  const nodePtyPath = findNodePtyPath()
  
  if (!nodePtyPath) {
    console.log('⚠️  node-pty not found, skipping rebuild')
    return
  }
  
  console.log(`📍 Found node-pty at: ${nodePtyPath}`)
  
  // 检查是否已经编译
  const buildPath = join(nodePtyPath, 'build', 'Release', 'pty.node')
  if (existsSync(buildPath)) {
    console.log('✅ node-pty already compiled')
    return
  }
  
  console.log('🔨 Rebuilding node-pty...')
  
  try {
    execSync('npx node-gyp rebuild', {
      cwd: nodePtyPath,
      stdio: 'inherit'
    })
    console.log('✅ node-pty rebuilt successfully')
  } catch (error) {
    console.warn('⚠️  Failed to rebuild node-pty:', error.message)
    console.warn('   This is usually not critical - the module may work anyway')
  }
}

// 执行重建
rebuildNodePty()

console.log('🎉 Postinstall script completed')