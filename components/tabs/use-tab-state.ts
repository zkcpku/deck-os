import { useState, useEffect } from 'react'

export function useTabState() {
  const [tabId, setTabIdState] = useState('text')

  // Initialize from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab') || 'text'
    setTabIdState(tab)
  }, [])

  // Update URL when tab changes
  const setTabId = (newTabId: string) => {
    setTabIdState(newTabId)
    const params = new URLSearchParams(window.location.search)
    params.set('tab', newTabId)
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`)
  }

  return [tabId, setTabId] as const
}
