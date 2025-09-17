'use client'

import { cn } from '@/lib/utils'
import { 
  File, Folder, Search, Home, ArrowUp, Save, X, Edit3, 
  Plus, FolderPlus, Upload, Trash2, Copy, Move, MoreHorizontal
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { FileContextMenu } from './context-menu'
import { FileItemComponent } from './file-item'
import { useSelectionManager } from './selection-manager'
import { UploadZone } from './upload-zone'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { BulkOperationDialog } from '@/components/ui/bulk-operation-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createFileOrFolder,
  renameItem,
  deleteItems,
  moveItems,
  copyItems,
  downloadFile,
  isTextFile,
} from '@/lib/file-operations'

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
  
  // New state for enhanced features
  const [showUploadZone, setShowUploadZone] = useState(false)
  const [createItemName, setCreateItemName] = useState('')
  const [createItemType, setCreateItemType] = useState<'file' | 'directory'>('file')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameTarget, setRenameTarget] = useState('')
  const [newName, setNewName] = useState('')
  const [clipboard, setClipboard] = useState<{ paths: string[], operation: 'copy' | 'cut' } | null>(null)
  
  // Dialogs state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTargets, setDeleteTargets] = useState<string[]>([])
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkOperation, setBulkOperation] = useState<'move' | 'copy'>('move')
  const [bulkTargets, setBulkTargets] = useState<string[]>([])
  const [operationResults, setOperationResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)

  // Selection manager
  const selectionManager = useSelectionManager()

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
        selectionManager.clearSelection()
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

  // New file operations
  const handleCreateFile = () => {
    setCreateItemType('file')
    setCreateItemName('')
    setShowCreateDialog(true)
  }

  const handleCreateFolder = () => {
    setCreateItemType('directory')
    setCreateItemName('')
    setShowCreateDialog(true)
  }

  const handleConfirmCreate = async () => {
    if (!createItemName.trim()) return

    try {
      const result = await createFileOrFolder(currentPath, createItemName.trim(), createItemType)
      if (result.success) {
        fetchFiles(currentPath)
        setShowCreateDialog(false)
        setCreateItemName('')
      } else {
        setError(result.error || 'Failed to create item')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create item')
    }
  }

  const handleRename = (path: string) => {
    setRenameTarget(path)
    setNewName(path.split('/').pop() || '')
    setShowRenameDialog(true)
  }

  const handleConfirmRename = async () => {
    if (!newName.trim() || !renameTarget) return

    const parentPath = renameTarget.substring(0, renameTarget.lastIndexOf('/'))
    const newPath = `${parentPath}/${newName.trim()}`

    try {
      const result = await renameItem(renameTarget, newPath)
      if (result.success) {
        fetchFiles(currentPath)
        setShowRenameDialog(false)
        setRenameTarget('')
        setNewName('')
        // Update selected file path if it was renamed
        if (selectedFile && selectedFile.path === renameTarget) {
          setSelectedFile(prev => prev ? { ...prev, path: newPath } : null)
        }
      } else {
        setError(result.error || 'Failed to rename item')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to rename item')
    }
  }

  const handleDelete = (paths: string[]) => {
    setDeleteTargets(paths)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    try {
      const result = await deleteItems(deleteTargets)
      setOperationResults(result.results)
      setShowResults(true)
      setShowDeleteDialog(false)
      fetchFiles(currentPath)
      
      // Clear selected file if it was deleted
      if (selectedFile && deleteTargets.includes(selectedFile.path)) {
        setSelectedFile(null)
        setEditMode(false)
      }
      
      selectionManager.clearSelection()
    } catch (err: any) {
      setError(err.message || 'Failed to delete items')
    }
  }

  const handleCopy = (paths: string[]) => {
    setClipboard({ paths, operation: 'copy' })
  }

  const handleCut = (paths: string[]) => {
    setClipboard({ paths, operation: 'cut' })
  }

  const handlePaste = async () => {
    if (!clipboard) return

    try {
      const result = clipboard.operation === 'copy' 
        ? await copyItems(clipboard.paths, currentPath)
        : await moveItems(clipboard.paths, currentPath)
      
      setOperationResults(result.results)
      setShowResults(true)
      fetchFiles(currentPath)
      
      if (clipboard.operation === 'cut') {
        setClipboard(null)
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${clipboard.operation} items`)
    }
  }

  const handleDownload = async (path: string) => {
    try {
      await downloadFile(path)
    } catch (err: any) {
      setError(err.message || 'Failed to download file')
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's' && selectedFile && editMode) {
      e.preventDefault()
      saveFile()
    } else if (e.ctrlKey && e.key === 'a' && !editMode) {
      e.preventDefault()
      selectionManager.selectAll(files.map(f => f.path))
    } else if (e.key === 'Delete' && selectionManager.selectedItems.length > 0) {
      e.preventDefault()
      handleDelete(selectionManager.selectedItems)
    } else if (e.ctrlKey && e.key === 'c' && selectionManager.selectedItems.length > 0) {
      e.preventDefault()
      handleCopy(selectionManager.selectedItems)
    } else if (e.ctrlKey && e.key === 'x' && selectionManager.selectedItems.length > 0) {
      e.preventDefault()
      handleCut(selectionManager.selectedItems)
    } else if (e.ctrlKey && e.key === 'v' && clipboard) {
      e.preventDefault()
      handlePaste()
    }
  }, [selectedFile, editMode, selectionManager.selectedItems, clipboard])

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

  const handleItemSelect = (path: string, event: React.MouseEvent) => {
    selectionManager.selectItem(path, event)
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

  return (
    <div className={cn('flex flex-col h-full border border-primary/18 bg-background rounded-sm', className)}>
      {/* Header with toolbar */}
      <div className="flex items-center px-2 py-1.5 border-b border-primary/18 bg-secondary">
        <span className="text-sm font-medium text-secondary-foreground">Files</span>
        <div className="flex items-center gap-1 ml-auto">
          {/* New action buttons */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCreateFile}
            title="New File"
            className="h-6 w-6 p-0"
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCreateFolder}
            title="New Folder"
            className="h-6 w-6 p-0"
          >
            <FolderPlus className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowUploadZone(!showUploadZone)}
            title="Upload Files"
            className="h-6 w-6 p-0"
          >
            <Upload className="w-3 h-3" />
          </Button>
          {selectionManager.selectedItems.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(selectionManager.selectedItems)}
              title="Delete Selected"
              className="h-6 w-6 p-0 text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
          {clipboard && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePaste}
              title={`Paste (${clipboard.operation})`}
              className="h-6 w-6 p-0"
            >
              {clipboard.operation === 'copy' ? <Copy className="w-3 h-3" /> : <Move className="w-3 h-3" />}
            </Button>
          )}
          <div className="w-px h-4 bg-border mx-1" />
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

      {/* Selection info */}
      {selectionManager.selectedItems.length > 0 && (
        <div className="px-2 py-1 border-b border-primary/18 bg-blue-50 dark:bg-blue-900/20">
          <div className="text-xs text-blue-600 dark:text-blue-400">
            {selectionManager.selectedItems.length} item{selectionManager.selectedItems.length > 1 ? 's' : ''} selected
            <button
              onClick={selectionManager.clearSelection}
              className="ml-2 text-blue-500 hover:text-blue-700 underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      
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

      {/* Upload zone */}
      {showUploadZone && (
        <div className="p-2 border-b border-primary/18">
          <UploadZone
            targetPath={currentPath}
            onUploadComplete={() => {
              fetchFiles(currentPath)
              setShowUploadZone(false)
            }}
          />
        </div>
      )}

      {/* Content area - vertical split */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* File list with context menu */}
        <div className={cn("flex-shrink-0 overflow-auto border-b border-primary/18", selectedFile ? "max-h-32" : "flex-1")}>
          {loading && (
            <div className="flex items-center justify-center p-4">
              <div className="text-xs text-gray-500">Loading...</div>
            </div>
          )}
          
          {!loading && (
            <FileContextMenu
              selectedItems={selectionManager.selectedItems}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onRename={handleRename}
              onDelete={handleDelete}
              onCopy={handleCopy}
              onCut={handleCut}
              onDownload={handleDownload}
            >
              <div className="p-1">
                <div className="space-y-0.5">
                  {files.map((file) => (
                    <FileItemComponent
                      key={file.path}
                      item={file}
                      isSelected={selectionManager.isSelected(file.path)}
                      onSelect={handleItemSelect}
                      onDoubleClick={handleItemClick}
                    />
                  ))}
                </div>
              </div>
            </FileContextMenu>
          )}
        </div>

        {/* File content editor - unchanged */}
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

      {/* Dialogs */}
      <ConfirmationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title={`Create New ${createItemType === 'file' ? 'File' : 'Folder'}`}
        description={`Enter a name for the new ${createItemType}:`}
        confirmText="Create"
        onConfirm={handleConfirmCreate}
      >
        <Input
          value={createItemName}
          onChange={(e) => setCreateItemName(e.target.value)}
          placeholder={`${createItemType === 'file' ? 'File' : 'Folder'} name...`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleConfirmCreate()
            }
          }}
        />
      </ConfirmationDialog>

      <ConfirmationDialog
        open={showRenameDialog}
        onOpenChange={setShowRenameDialog}
        title="Rename Item"
        description="Enter a new name:"
        confirmText="Rename"
        onConfirm={handleConfirmRename}
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New name..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleConfirmRename()
            }
          }}
        />
      </ConfirmationDialog>

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={`Delete ${deleteTargets.length} item${deleteTargets.length > 1 ? 's' : ''}`}
        description="This action cannot be undone. Are you sure you want to delete the selected items?"
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />

      <BulkOperationDialog
        open={showResults}
        onOpenChange={setShowResults}
        operation="operation"
        items={operationResults.map(r => r.path)}
        onConfirm={() => {}}
        results={operationResults}
        showResults={true}
      />
    </div>
  )
}