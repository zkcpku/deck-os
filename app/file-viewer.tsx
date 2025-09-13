'use client'

import { Card } from '@/components/card'
import { cn } from '@/lib/utils'
import { File, Folder, Search, X, Download, Copy } from 'lucide-react'
import { useState, useEffect } from 'react'

interface FileViewerProps {
  className?: string
}

interface FileItem {
  name: string
  path: string
  type: 'file' | 'directory' | 'unknown'
  size?: number
  modified?: string
  error?: string
  permissions?: number
}

interface FileContent {
  name: string
  path: string
  content: string
  size: number
}

export function FileViewer({ className }: FileViewerProps) {
  const [currentPath, setCurrentPath] = useState('')
  const [inputPath, setInputPath] = useState('')
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null)
  const [fileLoading, setFileLoading] = useState(false)

  const fetchFiles = async (path: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load directory')
      }
      
      const data = await response.json()
      
      if (data.type === 'directory') {
        setFiles(data.items || [])
        setCurrentPath(data.path)
        setInputPath(data.path)
      } else if (data.type === 'file') {
        // If it's a file, show its content
        setSelectedFile({
          name: path.split('/').pop() || path,
          path: path,
          content: data.content || '',
          size: data.size || 0
        })
        // Navigate to parent directory
        const parentPath = path.substring(0, path.lastIndexOf('/'))
        if (parentPath) {
          fetchFiles(parentPath)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load directory')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch home directory on mount
    fetch('/api/files')
      .then(res => res.json())
      .then(data => {
        if (data.path) {
          setCurrentPath(data.path)
          setInputPath(data.path)
          fetchFiles(data.path)
        }
      })
      .catch(() => {
        // Fallback to root
        const defaultPath = '/'
        setCurrentPath(defaultPath)
        setInputPath(defaultPath)
        fetchFiles(defaultPath)
      })
  }, [])

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault()
    fetchFiles(inputPath)
  }

  const handleItemClick = async (item: FileItem) => {
    if (item.error) {
      setError(item.error)
      return
    }
    
    if (item.type === 'directory') {
      fetchFiles(item.path)
    } else if (item.type === 'file') {
      // Load file content for preview
      setFileLoading(true)
      try {
        const response = await fetch(`/api/files?path=${encodeURIComponent(item.path)}`)
        const data = await response.json()
        
        if (data.type === 'file') {
          setSelectedFile({
            name: item.name,
            path: item.path,
            content: data.content || '',
            size: data.size || item.size || 0
          })
        }
      } catch (err) {
        console.error('Failed to preview file:', err)
        setError('Failed to load file content')
      } finally {
        setFileLoading(false)
      }
    }
  }

  const handleCopyContent = async () => {
    if (selectedFile) {
      try {
        await navigator.clipboard.writeText(selectedFile.content)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const handleDownloadFile = () => {
    if (selectedFile) {
      const blob = new Blob([selectedFile.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = selectedFile.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  return (
    <Card className={cn('flex', className)}>
      {/* File list panel */}
      <div className="flex flex-col w-1/2 border-r">
        <div className="px-3 py-2 border-b">
          <form onSubmit={handleNavigate} className="flex gap-2">
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              className="flex-1 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-900 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter path..."
            />
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
        
        <div className="flex-1 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center p-4">
              <div className="text-sm text-gray-500">Loading...</div>
            </div>
          )}
          
          {error && (
            <div className="p-4">
              <div className="text-sm text-red-500">{error}</div>
            </div>
          )}
          
          {!loading && !error && (
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-2 px-2">
                Current: {currentPath}
              </div>
              
              <div className="space-y-0.5">
                {files.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => handleItemClick(file)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer",
                      file.type === 'directory' && "font-medium",
                      selectedFile?.path === file.path && "bg-blue-50 dark:bg-blue-900/30"
                    )}
                  >
                    <span className="flex-shrink-0">
                      {file.type === 'directory' ? (
                        <Folder className="w-4 h-4 text-blue-500" />
                      ) : (
                        <File className="w-4 h-4 text-gray-400" />
                      )}
                    </span>
                    
                    <span className="flex-1 truncate">{file.name}</span>
                    
                    {file.type === 'file' && (
                      <span className="text-xs text-gray-500">
                        {formatSize(file.size)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* File content panel */}
      <div className="flex flex-col w-1/2">
        {selectedFile ? (
          <>
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4" />
                <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                <span className="text-xs text-gray-500">({formatSize(selectedFile.size)})</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleCopyContent}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  title="Copy content"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownloadFile}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3 bg-gray-50 dark:bg-gray-900">
              {fileLoading ? (
                <div className="text-sm text-gray-500">Loading file...</div>
              ) : (
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {selectedFile.content}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
            Select a file to view its content
          </div>
        )}
      </div>
    </Card>
  )
}