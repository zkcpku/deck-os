import { create } from 'zustand'

export interface BrowserEvent {
  type: string
  timestamp: string
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
}

interface BrowserEventsStore {
  events: BrowserEvent[]
  addEvent: (event: BrowserEvent) => void
  clearEvents: () => void
}

export const useBrowserEvents = create<BrowserEventsStore>((set) => ({
  events: [],
  addEvent: (event) => set((state) => ({
    events: [...state.events, event]
  })),
  clearEvents: () => set({ events: [] }),
}))