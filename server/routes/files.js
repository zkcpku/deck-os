import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const requestPath = req.query.path || os.homedir()
    
    // Security: Resolve to absolute path and ensure it exists
    const absolutePath = path.resolve(requestPath)
    
    try {
      const stats = await fs.stat(absolutePath)
      
      if (!stats.isDirectory()) {
        // If it's a file, return file content
        const content = await fs.readFile(absolutePath, 'utf-8')
        return res.json({
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
      
      return res.json({
        type: 'directory',
        path: absolutePath,
        items: itemsWithStats
      })
      
    } catch (error) {
      return res.status(403).json({
        error: `Cannot access path: ${error.message}`
      })
    }
    
  } catch (error) {
    return res.status(500).json({
      error: `Failed to read path: ${error.message}`
    })
  }
})

export default router