import { useRef, useState, useEffect } from 'react'
import { TextDisplay } from '@/app/text-display'
import { Terminal, TerminalRef } from '@/app/terminal'
import { Browser } from '@/app/browser'
import { TabContent, TabItem } from '@/components/tabs'
import { Toaster } from '@/components/ui/sonner'
import {
  PanelResizeHandle,
  Panel,
  PanelGroup,
} from 'react-resizable-panels'

// Simple URL parameters hook to replace useSearchParams
function useUrlParams() {
  const [params, setParams] = useState(new URLSearchParams())
  
  useEffect(() => {
    setParams(new URLSearchParams(window.location.search))
  }, [])
  
  return params
}

function App() {
  const terminalRef = useRef<TerminalRef>(null)
  const searchParams = useUrlParams()
  
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

        {/* Desktop layout - Two columns: left (Browser Events + Terminal), right (Browser) */}
        <PanelGroup
          direction="horizontal"
          className="hidden md:flex flex-1 w-full"
        >
          {/* Left panel containing Browser Events and Terminal */}
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
          
          {/* Right panel containing Browser */}
          <Panel defaultSize={50} minSize={30}>
            <Browser className="h-full overflow-hidden" startUrl={startHtml} />
          </Panel>
        </PanelGroup>
      </div>
      <Toaster />
    </>
  )
}

export default App