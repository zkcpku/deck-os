// File operation types
export interface FileOperationResult {
  success: boolean
  error?: string
  path?: string
}

export interface BulkOperationResult {
  success: boolean
  results: Array<{
    path: string
    success: boolean
    error?: string
  }>
}

// Create file or folder
export async function createFileOrFolder(
  parentPath: string,
  name: string,
  type: 'file' | 'directory'
): Promise<FileOperationResult> {
  try {
    const response = await fetch('/api/files', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'create',
        path: parentPath,
        name,
        type,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to create item',
      }
    }

    return {
      success: true,
      path: result.path,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

// Rename file or folder
export async function renameItem(
  oldPath: string,
  newPath: string
): Promise<FileOperationResult> {
  try {
    const response = await fetch('/api/files', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'rename',
        path: oldPath,
        newPath,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to rename item',
      }
    }

    return {
      success: true,
      path: result.newPath,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

// Delete files or folders
export async function deleteItems(paths: string[]): Promise<BulkOperationResult> {
  try {
    const response = await fetch('/api/files', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paths,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        results: paths.map(path => ({
          path,
          success: false,
          error: result.error || 'Failed to delete item',
        })),
      }
    }

    return {
      success: true,
      results: result.results || [],
    }
  } catch (error) {
    return {
      success: false,
      results: paths.map(path => ({
        path,
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      })),
    }
  }
}

// Move files or folders
export async function moveItems(
  sourcePaths: string[],
  targetPath: string
): Promise<BulkOperationResult> {
  try {
    const response = await fetch('/api/files', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'move',
        sourcePaths,
        targetPath,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        results: sourcePaths.map(path => ({
          path,
          success: false,
          error: result.error || 'Failed to move item',
        })),
      }
    }

    return {
      success: true,
      results: result.results || [],
    }
  } catch (error) {
    return {
      success: false,
      results: sourcePaths.map(path => ({
        path,
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      })),
    }
  }
}

// Copy files or folders
export async function copyItems(
  sourcePaths: string[],
  targetPath: string
): Promise<BulkOperationResult> {
  try {
    const response = await fetch('/api/files', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'copy',
        sourcePaths,
        targetPath,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        results: sourcePaths.map(path => ({
          path,
          success: false,
          error: result.error || 'Failed to copy item',
        })),
      }
    }

    return {
      success: true,
      results: result.results || [],
    }
  } catch (error) {
    return {
      success: false,
      results: sourcePaths.map(path => ({
        path,
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      })),
    }
  }
}

// Upload files
export async function uploadFiles(
  files: File[],
  targetPath: string,
  overwrite: boolean = false
): Promise<BulkOperationResult> {
  try {
    const formData = new FormData()
    formData.append('targetPath', targetPath)
    if (overwrite) {
      formData.append('overwrite', 'true')
    }
    
    files.forEach(file => {
      formData.append('files', file)
    })

    const response = await fetch('/api/upload', {
      method: overwrite ? 'PUT' : 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        results: files.map(file => ({
          path: file.name,
          success: false,
          error: result.error || 'Failed to upload file',
        })),
      }
    }

    return {
      success: true,
      results: result.results?.map((r: any) => ({
        path: r.fileName,
        success: r.success,
        error: r.error,
      })) || [],
    }
  } catch (error) {
    return {
      success: false,
      results: files.map(file => ({
        path: file.name,
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      })),
    }
  }
}

// Download file
export async function downloadFile(filePath: string): Promise<void> {
  try {
    // First get the file content
    const response = await fetch(`/api/files?path=${encodeURIComponent(filePath)}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch file')
    }

    const result = await response.json()
    
    if (result.type !== 'file') {
      throw new Error('Cannot download directories')
    }

    // Create blob and download
    const blob = new Blob([result.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filePath.split('/').pop() || 'file'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download failed:', error)
    throw error
  }
}

// Helper function to format file sizes
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Helper function to get file extension
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot === -1 ? '' : filename.slice(lastDot + 1).toLowerCase()
}

// Helper function to check if file is text
export function isTextFile(filename: string): boolean {
  const textExtensions = [
    'txt', 'md', 'js', 'ts', 'tsx', 'jsx', 'json', 'css', 'html', 'xml',
    'yml', 'yaml', 'py', 'java', 'c', 'cpp', 'h', 'php', 'rb', 'go',
    'rs', 'sh', 'sql', 'csv', 'log', 'config', 'conf', 'ini'
  ]
  
  const extension = getFileExtension(filename)
  return textExtensions.includes(extension)
}