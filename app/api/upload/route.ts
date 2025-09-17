import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { isWriteAllowed } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const targetPath = formData.get('targetPath') as string

    if (!targetPath) {
      return NextResponse.json(
        { error: 'Target path is required' },
        { status: 400 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    const absoluteTargetPath = path.resolve(targetPath)

    if (!isWriteAllowed(absoluteTargetPath)) {
      return NextResponse.json(
        { error: 'Access denied: Cannot upload to this directory' },
        { status: 403 }
      )
    }

    const results = []

    try {
      // Ensure target directory exists
      await fs.mkdir(absoluteTargetPath, { recursive: true })

      for (const file of files) {
        if (!file.name) {
          results.push({
            fileName: 'unknown',
            success: false,
            error: 'Invalid file name'
          })
          continue
        }

        try {
          const filePath = path.join(absoluteTargetPath, file.name)
          
          // Check if file already exists
          const fileExists = await fs.access(filePath).then(() => true).catch(() => false)
          
          if (fileExists) {
            results.push({
              fileName: file.name,
              success: false,
              error: 'File already exists'
            })
            continue
          }

          // Convert File to Buffer
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Write file
          await fs.writeFile(filePath, buffer)

          // Get file stats
          const stats = await fs.stat(filePath)

          results.push({
            fileName: file.name,
            success: true,
            path: filePath,
            size: stats.size,
            modified: stats.mtime
          })

        } catch (error: any) {
          results.push({
            fileName: file.name,
            success: false,
            error: error.message
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length

      return NextResponse.json({
        success: true,
        uploaded: successCount,
        failed: failureCount,
        results: results
      })

    } catch (error: any) {
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
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

// PUT - Upload with overwrite option
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const targetPath = formData.get('targetPath') as string
    const overwrite = formData.get('overwrite') === 'true'

    if (!targetPath) {
      return NextResponse.json(
        { error: 'Target path is required' },
        { status: 400 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    const absoluteTargetPath = path.resolve(targetPath)

    if (!isWriteAllowed(absoluteTargetPath)) {
      return NextResponse.json(
        { error: 'Access denied: Cannot upload to this directory' },
        { status: 403 }
      )
    }

    const results = []

    try {
      // Ensure target directory exists
      await fs.mkdir(absoluteTargetPath, { recursive: true })

      for (const file of files) {
        if (!file.name) {
          results.push({
            fileName: 'unknown',
            success: false,
            error: 'Invalid file name'
          })
          continue
        }

        try {
          const filePath = path.join(absoluteTargetPath, file.name)
          
          // Check if file already exists and overwrite is not allowed
          if (!overwrite) {
            const fileExists = await fs.access(filePath).then(() => true).catch(() => false)
            
            if (fileExists) {
              results.push({
                fileName: file.name,
                success: false,
                error: 'File already exists'
              })
              continue
            }
          }

          // Convert File to Buffer
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Write file
          await fs.writeFile(filePath, buffer)

          // Get file stats
          const stats = await fs.stat(filePath)

          results.push({
            fileName: file.name,
            success: true,
            path: filePath,
            size: stats.size,
            modified: stats.mtime,
            overwritten: overwrite
          })

        } catch (error: any) {
          results.push({
            fileName: file.name,
            success: false,
            error: error.message
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length

      return NextResponse.json({
        success: true,
        uploaded: successCount,
        failed: failureCount,
        results: results
      })

    } catch (error: any) {
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
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