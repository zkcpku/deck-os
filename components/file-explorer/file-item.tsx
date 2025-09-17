'use client'

import { useState } from 'react'
import { FolderIcon, FileIcon } from 'lucide-react'

interface FileItem {
  name: string
  path: string
  type: 'file' | 'directory' | 'unknown'
  size?: number
  modified?: string
  error?: string
  permissions?: number
}

interface FileItemProps {
  item: FileItem
  isSelected: boolean
  onSelect: (path: string, event: React.MouseEvent) => void
  onDoubleClick: (item: FileItem) => void
  children?: React.ReactNode
}

export function FileItemComponent({
  item,
  isSelected,
  onSelect,
  onDoubleClick,
  children,
}: FileItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    onSelect(item.path, e)
  }

  const handleDoubleClick = () => {
    onDoubleClick(item)
  }

  const formatSize = (bytes?: number) => {
    if (item.type === 'directory') return ''
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors select-none ${
        isSelected
          ? 'bg-primary text-primary-foreground'
          : isHovered
          ? 'bg-muted'
          : ''
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {item.type === 'directory' ? (
          <FolderIcon className="h-4 w-4 text-blue-500" />
        ) : (
          <FileIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className="text-sm truncate block" title={item.name}>
          {item.name}
        </span>
      </div>

      {/* Size */}
      <div className="flex-shrink-0 w-16 text-right">
        <span className="text-xs text-muted-foreground">
          {formatSize(item.size)}
        </span>
      </div>

      {/* Modified date */}
      <div className="flex-shrink-0 w-32 text-right">
        <span className="text-xs text-muted-foreground">
          {formatDate(item.modified)}
        </span>
      </div>

      {/* Error indicator */}
      {item.error && (
        <div className="flex-shrink-0">
          <span className="text-xs text-destructive" title={item.error}>
            ⚠️
          </span>
        </div>
      )}

      {children}
    </div>
  )
}