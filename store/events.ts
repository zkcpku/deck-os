import { create } from 'zustand'

// Base event interface
interface BaseEvent {
  id: string
  timestamp: string
}

// Browser Event interface (existing)
export interface BrowserEvent extends BaseEvent {
  eventType: 'browser'
  type: string
  element: {
    tagName: string
    id: string
    className: string
    text: string
    href: string
    src: string
  }
  details: any
  url: string
  // Console-specific fields
  level?: 'log' | 'warn' | 'error' | 'info' | 'debug'
  args?: string[]
  stack?: string
}

// Terminal Event interface
export interface TerminalEvent extends BaseEvent {
  eventType: 'terminal'
  type: 'command' | 'output' | 'input' | 'session' | 'navigation'
  sessionId: string
  details: {
    command?: string
    output?: string
    exitCode?: number
    workingDirectory?: string
    inputKey?: string
    shellType?: string
    executionTime?: number
    outputLength?: number
    processId?: number
  }
}

// File Event interface
export interface FileEvent extends BaseEvent {
  eventType: 'file'
  type: 'navigation' | 'operation' | 'selection' | 'upload' | 'edit'
  details: {
    operation?: 'create' | 'delete' | 'rename' | 'copy' | 'move' | 'cut' | 'delete_complete' | 'copy_complete' | 'cut_complete' | 'copy_to_clipboard' | 'cut_to_clipboard'
    sourcePath?: string
    targetPath?: string
    fileName?: string
    fileType?: 'file' | 'directory'
    selectionCount?: number
    uploadStatus?: 'start' | 'started' | 'progress' | 'complete' | 'completed'
    editAction?: 'open' | 'save' | 'modify'
    fileSize?: number
    success?: boolean
    error?: string
  }
}

// Union type for all events
export type Event = BrowserEvent | TerminalEvent | FileEvent

interface EventsStore {
  events: Event[]
  addEvent: (event: Event) => void
  clearEvents: () => void
  clearEventsByType: (eventType: 'browser' | 'terminal' | 'file') => void
  getEventsByType: (eventType: 'browser' | 'terminal' | 'file') => Event[]
}

export const useEvents = create<EventsStore>((set, get) => ({
  events: [],
  
  addEvent: (event) => set((state) => {
    // Check for duplicate events by unique ID
    const isDuplicate = state.events.some(existing => existing.id === event.id)
    
    if (isDuplicate) {
      return state // Don't add duplicate event
    }
    
    return {
      events: [...state.events, event]
    }
  }),
  
  clearEvents: () => set({ events: [] }),
  
  clearEventsByType: (eventType) => set((state) => ({
    events: state.events.filter(event => event.eventType !== eventType)
  })),
  
  getEventsByType: (eventType) => {
    return get().events.filter(event => event.eventType === eventType)
  },
}))

// Backward compatibility export
export const useBrowserEvents = useEvents