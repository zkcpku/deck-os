'use client'

import { useState, useCallback } from 'react'

export interface SelectionManagerHook {
  selectedItems: string[]
  isSelected: (path: string) => boolean
  selectItem: (path: string, event: React.MouseEvent) => void
  selectAll: (items: string[]) => void
  clearSelection: () => void
  toggleSelection: (path: string) => void
  selectRange: (startPath: string, endPath: string, allItems: string[]) => void
}

export function useSelectionManager(): SelectionManagerHook {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [lastSelectedItem, setLastSelectedItem] = useState<string | null>(null)

  const isSelected = useCallback((path: string) => {
    return selectedItems.includes(path)
  }, [selectedItems])

  const selectItem = useCallback((path: string, event: React.MouseEvent) => {
    event.preventDefault()
    
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + click: toggle selection
      setSelectedItems(prev => {
        const isCurrentlySelected = prev.includes(path)
        if (isCurrentlySelected) {
          return prev.filter(item => item !== path)
        } else {
          return [...prev, path]
        }
      })
      setLastSelectedItem(path)
    } else if (event.shiftKey && lastSelectedItem) {
      // Shift + click: select range (to be implemented by parent)
      // For now, just add to selection
      setSelectedItems(prev => {
        if (!prev.includes(path)) {
          return [...prev, path]
        }
        return prev
      })
    } else {
      // Regular click: select only this item
      setSelectedItems([path])
      setLastSelectedItem(path)
    }
  }, [lastSelectedItem])

  const selectAll = useCallback((items: string[]) => {
    setSelectedItems([...items])
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
    setLastSelectedItem(null)
  }, [])

  const toggleSelection = useCallback((path: string) => {
    setSelectedItems(prev => {
      const isCurrentlySelected = prev.includes(path)
      if (isCurrentlySelected) {
        return prev.filter(item => item !== path)
      } else {
        return [...prev, path]
      }
    })
  }, [])

  const selectRange = useCallback((startPath: string, endPath: string, allItems: string[]) => {
    const startIndex = allItems.indexOf(startPath)
    const endIndex = allItems.indexOf(endPath)
    
    if (startIndex === -1 || endIndex === -1) return
    
    const minIndex = Math.min(startIndex, endIndex)
    const maxIndex = Math.max(startIndex, endIndex)
    
    const rangeItems = allItems.slice(minIndex, maxIndex + 1)
    
    setSelectedItems(prev => {
      const newSelection = new Set([...prev, ...rangeItems])
      return Array.from(newSelection)
    })
  }, [])

  return {
    selectedItems,
    isSelected,
    selectItem,
    selectAll,
    clearSelection,
    toggleSelection,
    selectRange,
  }
}