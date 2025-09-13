'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { TextDisplay } from './text-display'
import { Terminal, TerminalRef } from './terminal'
import { Browser } from './browser'
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
        </div>

        {/* Desktop layout - Single column with resizable panels */}
        <PanelGroup
          direction="vertical"
          className="hidden md:flex flex-1 w-full"
        >
          <Panel defaultSize={33} minSize={10}>
            <TextDisplay className="h-full overflow-hidden" getTerminalContent={getTerminalContent} />
          </Panel>
          
          <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
          
          <Panel defaultSize={33} minSize={10}>
            <Browser className="h-full overflow-hidden" startUrl={startHtml} />
          </Panel>
          
          <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
          
          <Panel defaultSize={34} minSize={10}>
            <Terminal ref={terminalRef} className="h-full overflow-hidden" startCommand={startCmd} />
          </Panel>
        </PanelGroup>
      </div>
    </>
  )
}