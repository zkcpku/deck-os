'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { TextDisplay } from './text-display'
import { Terminal, TerminalRef } from './terminal'
import { Browser } from './browser'
import { FileExplorer } from '@/components/file-explorer'
import { TabContent, TabItem } from '@/components/tabs'
import {
  PanelResizeHandle,
  Panel,
  PanelGroup,
} from 'react-resizable-panels'

export default function Page() {
  const terminalRef = useRef<TerminalRef>(null)
  const searchParams = useSearchParams()
  
  // Get URL parameters
  const startHtml = searchParams.get('starthtml')
  const startCmd = searchParams.get('startcmd')

  const getTerminalContent = () => {
    return terminalRef.current?.getTerminalContent() || ''
  }
  return (
    <>
      <div className="flex flex-col h-screen max-h-screen overflow-hidden p-2">
        {/* Mobile layout tabs */}
        <ul className="flex space-x-5 font-mono text-sm tracking-tight px-1 py-2 md:hidden">
          <TabItem tabId="text">Text</TabItem>
          <TabItem tabId="browser">Browser</TabItem>
          <TabItem tabId="terminal">Terminal</TabItem>
          <TabItem tabId="files">Files</TabItem>
        </ul>

        {/* Mobile layout tabs taking the whole space*/}
        <div className="flex flex-1 w-full overflow-hidden md:hidden">
          <TabContent tabId="text" className="flex-1">
            <TextDisplay className="flex-1 overflow-hidden" getTerminalContent={getTerminalContent} />
          </TabContent>
          <TabContent tabId="browser" className="flex-1">
            <Browser className="flex-1 overflow-hidden" startUrl={startHtml} />
          </TabContent>
          <TabContent tabId="terminal" className="flex-1">
            <Terminal ref={terminalRef} className="flex-1 overflow-hidden" startCommand={startCmd} />
          </TabContent>
          <TabContent tabId="files" className="flex-1">
            <FileExplorer className="flex-1 overflow-hidden" />
          </TabContent>
        </div>

        {/* Desktop layout - Two columns: left (Text + Terminal), right (Browser + Files) */}
        <PanelGroup
          direction="horizontal"
          className="hidden md:flex flex-1 w-full"
        >
          {/* Left panel containing Text Display and Terminal */}
          <Panel defaultSize={50} minSize={30}>
            <PanelGroup direction="vertical" className="h-full">
              <Panel defaultSize={50} minSize={20}>
                <TextDisplay className="h-full overflow-hidden" getTerminalContent={getTerminalContent} />
              </Panel>
              
              <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
              
              <Panel defaultSize={50} minSize={20}>
                <Terminal ref={terminalRef} className="h-full overflow-hidden" startCommand={startCmd} />
              </Panel>
            </PanelGroup>
          </Panel>
          
          <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
          
          {/* Right panel containing Browser and File Explorer */}
          <Panel defaultSize={50} minSize={30}>
            <PanelGroup direction="vertical" className="h-full">
              <Panel defaultSize={60} minSize={30}>
                <Browser className="h-full overflow-hidden" startUrl={startHtml} />
              </Panel>
              
              <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
              
              <Panel defaultSize={40} minSize={20}>
                <FileExplorer className="h-full overflow-hidden" />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </>
  )
}