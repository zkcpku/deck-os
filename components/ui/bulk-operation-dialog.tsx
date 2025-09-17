'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface BulkOperationResult {
  path: string
  success: boolean
  error?: string
}

interface BulkOperationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  operation: string
  items: string[]
  onConfirm: () => void
  onCancel?: () => void
  isLoading?: boolean
  results?: BulkOperationResult[]
  showResults?: boolean
}

export function BulkOperationDialog({
  open,
  onOpenChange,
  operation,
  items,
  onConfirm,
  onCancel,
  isLoading = false,
  results,
  showResults = false,
}: BulkOperationDialogProps) {
  const handleConfirm = () => {
    onConfirm()
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  const isDestructive = operation === 'delete'
  const operationTitle = operation.charAt(0).toUpperCase() + operation.slice(1)

  if (showResults && results) {
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{operationTitle} Results</DialogTitle>
            <DialogDescription>
              {successCount > 0 && `${successCount} items processed successfully. `}
              {failureCount > 0 && `${failureCount} items failed.`}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <span className="text-sm truncate flex-1">
                    {result.path.split('/').pop() || result.path}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={result.success ? 'default' : 'destructive'}
                    >
                      {result.success ? 'Success' : 'Failed'}
                    </Badge>
                    {result.error && (
                      <span className="text-xs text-muted-foreground max-w-32 truncate">
                        {result.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {operationTitle} {items.length} item{items.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            {isDestructive
              ? 'This action cannot be undone. The following items will be permanently deleted:'
              : `The following items will be ${operation}ed:`}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-64">
          <div className="space-y-1">
            {items.map((item, index) => (
              <div
                key={index}
                className="text-sm p-2 bg-muted rounded truncate"
                title={item}
              >
                {item.split('/').pop() || item}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : `${operationTitle} ${items.length} item${items.length > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}