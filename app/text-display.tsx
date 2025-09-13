'use client'

import { Card } from '@/components/card'
import { cn } from '@/lib/utils'
import { Copy, Download, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface TextDisplayProps {
  className?: string
}

export function TextDisplay({ className }: TextDisplayProps) {
  const [text, setText] = useState(`Welcome to the Text Display Panel!

This is a versatile text display window where you can:
- View and edit any text content
- Copy text to clipboard
- Clear the display
- Save content to file

You can type or paste any content here.
This panel replaces the chat interface with a more general-purpose text viewer.

Example content:
-------------------
{
  "name": "Example JSON",
  "type": "display",
  "features": [
    "Editable",
    "Copyable",
    "Clearable"
  ]
}
-------------------

Feel free to modify this text as needed!`)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleClear = () => {
    setText('')
  }

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `text-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-medium">Text Display</h3>
        <div className="flex gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Download as file"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-red-500"
            title="Clear text"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-3 overflow-auto">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-full p-2 bg-transparent resize-none focus:outline-none font-mono text-sm"
          placeholder="Enter or paste text here..."
          spellCheck={false}
        />
      </div>
      
      <div className="px-3 py-1 border-t text-xs text-gray-500">
        {text.length} characters | {text.split('\n').length} lines | {text.split(/\s+/).filter(w => w).length} words
      </div>
    </Card>
  )
}