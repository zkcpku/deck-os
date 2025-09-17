'use client'

import { useState, useCallback } from 'react'
import { UploadIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BulkOperationDialog } from '@/components/ui/bulk-operation-dialog'

interface UploadZoneProps {
  targetPath: string
  onUploadComplete: () => void
  className?: string
}

interface UploadResult {
  fileName: string
  success: boolean
  error?: string
  path?: string
  size?: number
}

export function UploadZone({ targetPath, onUploadComplete, className }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [showResults, setShowResults] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      setSelectedFiles(files)
      setShowUploadDialog(true)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(files)
      setShowUploadDialog(true)
    }
    // Reset input value to allow selecting the same files again
    e.target.value = ''
  }, [])

  const handleUpload = async (overwrite: boolean = false) => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setShowUploadDialog(false)

    try {
      const formData = new FormData()
      formData.append('targetPath', targetPath)
      if (overwrite) {
        formData.append('overwrite', 'true')
      }
      
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/upload', {
        method: overwrite ? 'PUT' : 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadResults(result.results || [])
        setShowResults(true)
        onUploadComplete()
      } else {
        console.error('Upload failed:', result.error)
        setUploadResults([{
          fileName: 'Upload',
          success: false,
          error: result.error
        }])
        setShowResults(true)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadResults([{
        fileName: 'Upload',
        success: false,
        error: 'Network error occurred'
      }])
      setShowResults(true)
    } finally {
      setIsUploading(false)
      setSelectedFiles([])
    }
  }

  const handleUploadWithOverwrite = () => {
    handleUpload(true)
  }

  const handleCancelUpload = () => {
    setSelectedFiles([])
    setShowUploadDialog(false)
  }

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index))
  }

  return (
    <>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/10'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        } ${className || ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Drag and drop files here, or
        </p>
        <label htmlFor="file-upload">
          <Button variant="outline" size="sm" disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Browse Files'}
          </Button>
          <input
            id="file-upload"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Upload Confirmation Dialog */}
      <BulkOperationDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        operation="upload"
        items={selectedFiles.map(f => f.name)}
        onConfirm={() => handleUpload(false)}
        onCancel={handleCancelUpload}
        isLoading={isUploading}
      />

      {/* Upload Results Dialog */}
      <BulkOperationDialog
        open={showResults}
        onOpenChange={setShowResults}
        operation="upload"
        items={selectedFiles.map(f => f.name)}
        onConfirm={() => {}}
        results={uploadResults.map(r => ({
          path: r.fileName,
          success: r.success,
          error: r.error
        }))}
        showResults={true}
      />
    </>
  )
}