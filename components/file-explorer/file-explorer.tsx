'use client'

import { cn } from '@/lib/utils'
import { File, Folder, Search, Home, ArrowUp, Save, X, Edit3 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

interface FileExplorerProps {
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
  isModified: boolean
}

export function FileExplorer({ className }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState('')
  const [inputPath, setInputPath] = useState('')
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

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
        // If it's a file, navigate to parent directory
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/'
        fetchFiles(parentPath)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load directory')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFileContent = async (filePath: string) => {
    setFileLoading(true)
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(filePath)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load file')
      }
      
      const data = await response.json()
      
      if (data.type === 'file') {
        setSelectedFile({
          name: filePath.split('/').pop() || filePath,
          path: filePath,
          content: data.content || '',
          size: data.size || 0,
          isModified: false
        })
        setEditMode(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load file content')
      console.error(err)
    } finally {
      setFileLoading(false)
    }
  }

  const saveFile = async () => {
    if (!selectedFile) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: selectedFile.path,
          content: selectedFile.content
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save file')
      }
      
      const data = await response.json()
      setSelectedFile(prev => prev ? {
        ...prev,
        isModified: false,
        size: data.size
      } : null)
      
      // Refresh file list to update file size
      fetchFiles(currentPath)
      
    } catch (err: any) {
      setError(err.message || 'Failed to save file')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleContentChange = (newContent: string) => {
    if (selectedFile) {
      setSelectedFile({
        ...selectedFile,
        content: newContent,
        isModified: selectedFile.content !== newContent
      })
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's' && selectedFile && editMode) {
      e.preventDefault()
      saveFile()
    }
  }, [selectedFile, editMode])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

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

  const handleItemClick = (item: FileItem) => {
    if (item.error) {
      setError(item.error)
      return
    }
    
    if (item.type === 'directory') {
      fetchFiles(item.path)
      // Clear selected file when navigating
      setSelectedFile(null)
      setEditMode(false)
    } else if (item.type === 'file') {
      fetchFileContent(item.path)
    }
  }

  const handleHomeClick = () => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => {
        if (data.path) {
          fetchFiles(data.path)
        }
      })
      .catch(() => fetchFiles('/'))
  }

  const handleUpClick = () => {
    if (currentPath && currentPath !== '/') {
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/'
      fetchFiles(parentPath)
    }
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(0)}${units[unitIndex]}`
  }

  const isTextFile = (filename: string) => {
    const textExtensions = ['.txt', '.md', '.js', '.ts', '.tsx', '.jsx', '.json', '.css', '.html', '.xml', '.yml', '.yaml', '.py', '.java', '.c', '.cpp', '.h', '.php', '.rb', '.go', '.rs', '.sh', '.sql', '.csv']
    return textExtensions.some(ext => filename.toLowerCase().endsWith(ext))
  }

  return (
    <div className={cn('flex flex-col h-full border border-primary/18 bg-background rounded-sm', className)}>
      {/* Header */}
      <div className="flex items-center px-2 py-1.5 border-b border-primary/18 bg-secondary">
        <span className="text-sm font-medium text-secondary-foreground">Files</span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleHomeClick}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs"
            title="Home"
          >
            <Home className="w-3 h-3" />
          </button>
          <button
            onClick={handleUpClick}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs"
            title="Up"
            disabled={!currentPath || currentPath === '/'}
          >
            <ArrowUp className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Path input */}
      <div className="px-2 py-1 border-b border-primary/18">
        <form onSubmit={handleNavigate} className="flex gap-1">
          <input
            type="text"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            className="flex-1 px-1.5 py-0.5 text-xs bg-gray-50 dark:bg-gray-900 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Path..."
          />
          <button
            type="submit"
            className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <Search className="w-3 h-3" />
          </button>
        </form>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="px-2 py-1 border-b border-primary/18 bg-red-50 dark:bg-red-900/20">
          <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
          <button 
            onClick={() => setError(null)}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Content area - vertical split */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* File list */}
        <div className={cn("flex-shrink-0 overflow-auto border-b border-primary/18", selectedFile ? "max-h-32" : "flex-1")}>
          {loading && (
            <div className="flex items-center justify-center p-4">
              <div className="text-xs text-gray-500">Loading...</div>
            </div>
          )}
          
          {!loading && (
            <div className="p-1">
              <div className="space-y-0.5">
                {files.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => handleItemClick(file)}
                    className={cn(
                      "flex items-center gap-1.5 px-1.5 py-1 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer",
                      file.type === 'directory' && "font-medium",
                      file.error && "text-red-500 cursor-not-allowed",
                      selectedFile?.path === file.path && "bg-blue-50 dark:bg-blue-900/30"
                    )}
                  >
                    <span className="flex-shrink-0">
                      {file.type === 'directory' ? (
                        <Folder className="w-3 h-3 text-blue-500" />
                      ) : (
                        <File className="w-3 h-3 text-gray-400" />
                      )}
                    </span>
                    
                    <span className="flex-1 truncate min-w-0">{file.name}</span>
                    
                    {file.type === 'file' && file.size && (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatSize(file.size)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* File content editor */}
        {selectedFile && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* File header */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-primary/18 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-1">
                <File className="w-3 h-3" />
                <span className="text-xs font-medium truncate">{selectedFile.name}</span>
                {selectedFile.isModified && <span className="text-xs text-orange-500">●</span>}
                <span className="text-xs text-gray-500">({formatSize(selectedFile.size)})</span>
              </div>
              <div className="flex gap-1">
                {editMode ? (
                  <>
                    <button
                      onClick={saveFile}
                      disabled={!selectedFile.isModified || saving}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
                      title="Save (Ctrl+S)"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      title="View mode"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Edit mode"
                    disabled={!isTextFile(selectedFile.name)}
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setEditMode(false)
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  title="Close"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* File content */}
            <div className="flex-1 overflow-auto">
              {fileLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="text-xs text-gray-500">Loading file...</div>
                </div>
              ) : editMode ? (
                <textarea
                  value={selectedFile.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full h-full p-2 text-xs font-mono bg-white dark:bg-gray-900 border-0 resize-none focus:outline-none"
                  placeholder="File content..."
                  disabled={saving}
                />
              ) : (
                <pre className="p-2 text-xs font-mono whitespace-pre-wrap break-all">
                  {selectedFile.content}
                </pre>
              )}
            </div>

            {saving && (
              <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border-t border-primary/18">
                <div className="text-xs text-blue-600 dark:text-blue-400">Saving...</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}