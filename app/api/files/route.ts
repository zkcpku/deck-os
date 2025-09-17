import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { getConfig, isWriteAllowed } from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const config = getConfig()
    const requestPath = searchParams.get('path') || config.defaultFilePath
    
    // Security: Resolve to absolute path and ensure it exists
    const absolutePath = path.resolve(requestPath)
    
    try {
      const stats = await fs.stat(absolutePath)
      
      if (!stats.isDirectory()) {
        // If it's a file, return file content
        const content = await fs.readFile(absolutePath, 'utf-8')
        return NextResponse.json({
          type: 'file',
          path: absolutePath,
          content: content,
          size: stats.size,
          modified: stats.mtime
        })
      }
      
      // Read directory contents
      const items = await fs.readdir(absolutePath)
      const itemsWithStats = await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(absolutePath, item)
          try {
            const itemStats = await fs.stat(itemPath)
            return {
              name: item,
              path: itemPath,
              type: itemStats.isDirectory() ? 'directory' : 'file',
              size: itemStats.size,
              modified: itemStats.mtime.toISOString(),
              permissions: itemStats.mode
            }
          } catch (error) {
            // Handle permission errors for individual items
            return {
              name: item,
              path: itemPath,
              type: 'unknown',
              error: 'Permission denied'
            }
          }
        })
      )
      
      // Add parent directory entry if not at root
      if (absolutePath !== '/') {
        itemsWithStats.unshift({
          name: '..',
          path: path.dirname(absolutePath),
          type: 'directory',
          size: 0,
          modified: new Date().toISOString(),
          permissions: 0
        })
      }
      
      // Sort: directories first, then files, alphabetically
      itemsWithStats.sort((a, b) => {
        if (a.name === '..') return -1
        if (b.name === '..') return 1
        if (a.type === 'directory' && b.type !== 'directory') return -1
        if (a.type !== 'directory' && b.type === 'directory') return 1
        return a.name.localeCompare(b.name)
      })
      
      return NextResponse.json({
        type: 'directory',
        path: absolutePath,
        items: itemsWithStats
      })
      
    } catch (error: any) {
      return NextResponse.json(
        { error: `Cannot access path: ${error.message}` },
        { status: 403 }
      )
    }
    
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to read path: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path: filePath, content } = body
    
    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: 'Path and content are required' },
        { status: 400 }
      )
    }
    
    // Security: Resolve to absolute path and validate
    const absolutePath = path.resolve(filePath)
    
    if (!isWriteAllowed(absolutePath)) {
      return NextResponse.json(
        { error: 'Access denied: Cannot write to this directory' },
        { status: 403 }
      )
    }
    
    try {
      // Ensure directory exists
      const dirPath = path.dirname(absolutePath)
      await fs.mkdir(dirPath, { recursive: true })
      
      // Write file
      await fs.writeFile(absolutePath, content, 'utf-8')
      
      // Get updated file stats
      const stats = await fs.stat(absolutePath)
      
      return NextResponse.json({
        success: true,
        path: absolutePath,
        size: stats.size,
        modified: stats.mtime
      })
      
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to write file: ${error.message}` },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    return NextResponse.json(
      { error: `Invalid request: ${error.message}` },
      { status: 400 }
    )
  }
}

// PUT - Create files/folders, rename operations
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation, path: targetPath, newPath, name, type } = body
    
    if (!operation || !targetPath) {
      return NextResponse.json(
        { error: 'Operation and path are required' },
        { status: 400 }
      )
    }
    
    const absolutePath = path.resolve(targetPath)
    
    if (!isWriteAllowed(absolutePath)) {
      return NextResponse.json(
        { error: 'Access denied: Cannot modify this directory' },
        { status: 403 }
      )
    }
    
    try {
      switch (operation) {
        case 'create':
          if (!name || !type) {
            return NextResponse.json(
              { error: 'Name and type are required for create operation' },
              { status: 400 }
            )
          }
          
          const createPath = path.join(absolutePath, name)
          
          if (type === 'directory') {
            await fs.mkdir(createPath, { recursive: true })
          } else {
            // Ensure parent directory exists
            await fs.mkdir(path.dirname(createPath), { recursive: true })
            await fs.writeFile(createPath, '', 'utf-8')
          }
          
          const createStats = await fs.stat(createPath)
          return NextResponse.json({
            success: true,
            path: createPath,
            type: type,
            size: createStats.size,
            modified: createStats.mtime
          })
          
        case 'rename':
          if (!newPath) {
            return NextResponse.json(
              { error: 'New path is required for rename operation' },
              { status: 400 }
            )
          }
          
          const newAbsolutePath = path.resolve(newPath)
          
          if (!isWriteAllowed(newAbsolutePath)) {
            return NextResponse.json(
              { error: 'Access denied: Cannot rename to this location' },
              { status: 403 }
            )
          }
          
          await fs.rename(absolutePath, newAbsolutePath)
          
          const renameStats = await fs.stat(newAbsolutePath)
          return NextResponse.json({
            success: true,
            oldPath: absolutePath,
            newPath: newAbsolutePath,
            size: renameStats.size,
            modified: renameStats.mtime
          })
          
        default:
          return NextResponse.json(
            { error: `Unsupported operation: ${operation}` },
            { status: 400 }
          )
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: `Operation failed: ${error.message}` },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    return NextResponse.json(
      { error: `Invalid request: ${error.message}` },
      { status: 400 }
    )
  }
}

// DELETE - Delete files/folders
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { paths } = body
    
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { error: 'Paths array is required' },
        { status: 400 }
      )
    }
    
    const results = []
    
    for (const targetPath of paths) {
      const absolutePath = path.resolve(targetPath)
      
      if (!isWriteAllowed(absolutePath)) {
        results.push({
          path: targetPath,
          success: false,
          error: 'Access denied'
        })
        continue
      }
      
      try {
        const stats = await fs.stat(absolutePath)
        
        if (stats.isDirectory()) {
          await fs.rmdir(absolutePath, { recursive: true })
        } else {
          await fs.unlink(absolutePath)
        }
        
        results.push({
          path: targetPath,
          success: true
        })
      } catch (error: any) {
        results.push({
          path: targetPath,
          success: false,
          error: error.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      results: results
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: `Invalid request: ${error.message}` },
      { status: 400 }
    )
  }
}

// PATCH - Move/copy operations
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation, sourcePaths, targetPath } = body
    
    if (!operation || !sourcePaths || !targetPath) {
      return NextResponse.json(
        { error: 'Operation, source paths, and target path are required' },
        { status: 400 }
      )
    }
    
    if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) {
      return NextResponse.json(
        { error: 'Source paths must be a non-empty array' },
        { status: 400 }
      )
    }
    
    const targetAbsolutePath = path.resolve(targetPath)
    
    if (!isWriteAllowed(targetAbsolutePath)) {
      return NextResponse.json(
        { error: 'Access denied: Cannot modify target directory' },
        { status: 403 }
      )
    }
    
    const results = []
    
    for (const sourcePath of sourcePaths) {
      const sourceAbsolutePath = path.resolve(sourcePath)
      
      if (operation === 'move' && !isWriteAllowed(sourceAbsolutePath)) {
        results.push({
          sourcePath: sourcePath,
          success: false,
          error: 'Access denied to source path'
        })
        continue
      }
      
      try {
        const fileName = path.basename(sourceAbsolutePath)
        const finalTargetPath = path.join(targetAbsolutePath, fileName)
        
        // Ensure target directory exists
        await fs.mkdir(targetAbsolutePath, { recursive: true })
        
        if (operation === 'move') {
          await fs.rename(sourceAbsolutePath, finalTargetPath)
        } else if (operation === 'copy') {
          const stats = await fs.stat(sourceAbsolutePath)
          
          if (stats.isDirectory()) {
            // Recursive copy for directories
            await copyDirectory(sourceAbsolutePath, finalTargetPath)
          } else {
            await fs.copyFile(sourceAbsolutePath, finalTargetPath)
          }
        } else {
          results.push({
            sourcePath: sourcePath,
            success: false,
            error: `Unsupported operation: ${operation}`
          })
          continue
        }
        
        results.push({
          sourcePath: sourcePath,
          targetPath: finalTargetPath,
          success: true
        })
        
      } catch (error: any) {
        results.push({
          sourcePath: sourcePath,
          success: false,
          error: error.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      operation: operation,
      results: results
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: `Invalid request: ${error.message}` },
      { status: 400 }
    )
  }
}

// Helper function for recursive directory copying
async function copyDirectory(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true })
  
  const entries = await fs.readdir(src, { withFileTypes: true })
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}