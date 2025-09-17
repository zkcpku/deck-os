'use client'

import { useState } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  FileIcon,
  FolderIcon,
  EditIcon,
  TrashIcon,
  CopyIcon,
  ScissorsIcon,
  DownloadIcon,
} from 'lucide-react'

interface FileContextMenuProps {
  children: React.ReactNode
  selectedItems: string[]
  onCreateFile: () => void
  onCreateFolder: () => void
  onRename: (path: string) => void
  onDelete: (paths: string[]) => void
  onCopy: (paths: string[]) => void
  onCut: (paths: string[]) => void
  onDownload?: (path: string) => void
  isDirectory?: boolean
}

export function FileContextMenu({
  children,
  selectedItems,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onCopy,
  onCut,
  onDownload,
  isDirectory = false,
}: FileContextMenuProps) {
  const hasSelection = selectedItems.length > 0
  const isSingleSelection = selectedItems.length === 1

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {/* Create operations - only show when no selection or on directory */}
        {(!hasSelection || isDirectory) && (
          <>
            <ContextMenuItem onClick={onCreateFile}>
              <FileIcon className="h-4 w-4 mr-2" />
              New File
            </ContextMenuItem>
            <ContextMenuItem onClick={onCreateFolder}>
              <FolderIcon className="h-4 w-4 mr-2" />
              New Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {/* Operations on selected items */}
        {hasSelection && (
          <>
            {isSingleSelection && (
              <ContextMenuItem onClick={() => onRename(selectedItems[0])}>
                <EditIcon className="h-4 w-4 mr-2" />
                Rename
              </ContextMenuItem>
            )}
            
            <ContextMenuItem onClick={() => onCopy(selectedItems)}>
              <CopyIcon className="h-4 w-4 mr-2" />
              Copy
            </ContextMenuItem>
            
            <ContextMenuItem onClick={() => onCut(selectedItems)}>
              <ScissorsIcon className="h-4 w-4 mr-2" />
              Cut
            </ContextMenuItem>
            
            {isSingleSelection && onDownload && !isDirectory && (
              <ContextMenuItem onClick={() => onDownload(selectedItems[0])}>
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download
              </ContextMenuItem>
            )}
            
            <ContextMenuSeparator />
            
            <ContextMenuItem 
              onClick={() => onDelete(selectedItems)}
              className="text-destructive focus:text-destructive"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete {selectedItems.length > 1 ? `${selectedItems.length} items` : ''}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}