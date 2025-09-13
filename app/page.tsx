'use client'

import { TextDisplay } from './text-display'
import { FileViewer } from './file-viewer'
import { Header } from './header'
import { Terminal } from './terminal'
import { Browser } from './browser'
import { TabContent, TabItem } from '@/components/tabs'
import {
  PanelResizeHandle,
  Panel,
  PanelGroup,
} from 'react-resizable-panels'

export default function Page() {
  return (
    <>
      <div className="flex flex-col h-screen max-h-screen overflow-hidden p-2">
        <Header className="flex items-center w-full mb-2" />
        
        {/* Mobile layout tabs */}
        <ul className="flex space-x-5 font-mono text-sm tracking-tight px-1 py-2 md:hidden">
          <TabItem tabId="text">Text</TabItem>
          <TabItem tabId="browser">Browser</TabItem>
          <TabItem tabId="files">Files</TabItem>
          <TabItem tabId="terminal">Terminal</TabItem>
        </ul>

        {/* Mobile layout tabs taking the whole space*/}
        <div className="flex flex-1 w-full overflow-hidden md:hidden">
          <TabContent tabId="text" className="flex-1">
            <TextDisplay className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="browser" className="flex-1">
            <Browser className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="files" className="flex-1">
            <FileViewer className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="terminal" className="flex-1">
            <Terminal className="flex-1 overflow-hidden" />
          </TabContent>
        </div>

        {/* Desktop layout - Single column with resizable panels */}
        <PanelGroup
          direction="vertical"
          className="hidden md:flex flex-1 w-full"
        >
          <Panel defaultSize={25} minSize={10}>
            <TextDisplay className="h-full overflow-hidden" />
          </Panel>
          
          <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
          
          <Panel defaultSize={25} minSize={10}>
            <Browser className="h-full overflow-hidden" />
          </Panel>
          
          <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
          
          <Panel defaultSize={25} minSize={10}>
            <FileViewer className="h-full overflow-hidden" />
          </Panel>
          
          <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
          
          <Panel defaultSize={25} minSize={10}>
            <Terminal className="h-full overflow-hidden" />
          </Panel>
        </PanelGroup>
      </div>
    </>
  )
}