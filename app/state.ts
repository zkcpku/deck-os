import { create } from 'zustand'

interface SandboxState {
  status: 'running' | 'stopped'
  url: string
  urlUUID: string
}

interface SandboxStore extends SandboxState {
  setStatus: (status: SandboxState['status']) => void
  setUrl: (url: string) => void
  setUrlUUID: (uuid: string) => void
}

export const useSandboxStore = create<SandboxStore>((set) => ({
  status: 'running',
  url: '',
  urlUUID: 'default',
  setStatus: (status) => set({ status }),
  setUrl: (url) => set({ url }),
  setUrlUUID: (urlUUID) => set({ urlUUID }),
}))