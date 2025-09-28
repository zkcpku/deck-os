import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import fetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent'

// Create intelligent proxy-aware fetch function with fallback
function createIntelligentFetch() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.VERDENT_LLM_PROXY
  
  // Function to try proxy connection
  const createProxyFetch = () => {
    if (!proxyUrl) return null
    
    try {
      const agent = new HttpsProxyAgent(proxyUrl, {
        rejectUnauthorized: false,
        timeout: 15000, // Shorter timeout for proxy detection
      })
      
      return (url: string, options: any = {}) => {
        return fetch(url, {
          ...options,
          agent,
          timeout: 15000,
          headers: {
            ...options.headers,
            'User-Agent': 'AI-Summary/1.0',
          }
        })
      }
    } catch (error) {
      console.warn('Failed to create proxy agent:', error)
      return null
    }
  }
  
  // Function for direct connection
  const createDirectFetch = () => {
    return (url: string, options: any = {}) => {
      // Temporarily clear proxy environment variables for direct connection
      const originalHttpsProxy = process.env.HTTPS_PROXY
      const originalHttpProxy = process.env.HTTP_PROXY
      
      delete process.env.HTTPS_PROXY
      delete process.env.HTTP_PROXY
      
      const result = fetch(url, {
        ...options,
        timeout: 30000,
        headers: {
          ...options.headers,
          'User-Agent': 'AI-Summary/1.0',
        }
      })
      
      // Restore proxy environment variables
      if (originalHttpsProxy) process.env.HTTPS_PROXY = originalHttpsProxy
      if (originalHttpProxy) process.env.HTTP_PROXY = originalHttpProxy
      
      return result
    }
  }
  
  const proxyFetch = createProxyFetch()
  const directFetch = createDirectFetch()
  
  // Return intelligent fetch function with fallback
  return async (url: string, options: any = {}) => {
    // If proxy is configured, try proxy first
    if (proxyFetch && proxyUrl) {
      console.log('Attempting proxy connection to:', url)
      try {
        const response = await proxyFetch(url, options)
        
        // Check if we got a CloudFront error (common with corporate proxies)
        if (!response.ok) {
          const text = await response.text()
          if (text.includes('CloudFront') || text.includes('Bad request') || response.status === 400) {
            console.warn('Proxy blocked by CloudFront/Firewall, falling back to direct connection')
            throw new Error('Proxy blocked')
          }
        }
        
        console.log('Proxy connection successful')
        return response
      } catch (error: any) {
        console.warn('Proxy failed:', error.message)
        console.log('Attempting direct connection fallback...')
      }
    }
    
    // Fallback to direct connection
    console.log('Using direct connection to:', url)
    return directFetch(url, options)
  }
}

const intelligentFetch = createIntelligentFetch()

interface Event {
  id: string
  timestamp: string
  eventType: 'browser' | 'terminal' | 'file'
  type: string
  details?: any
  element?: any
  url?: string
  level?: string
  args?: string[]
  stack?: string
}

interface SummaryRequest {
  events: Event[]
  eventType: 'browser' | 'terminal' | 'file' | 'all'
  includeImages?: boolean
}

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in environment variables.' },
        { status: 500 }
      )
    }

    // Check if AI is enabled (for testing purposes)
    if (process.env.ENABLE_AI_SUMMARY === 'false') {
      return NextResponse.json(
        { error: 'AI Summary is currently disabled. Set ENABLE_AI_SUMMARY=true to enable.' },
        { status: 503 }
      )
    }

    // Check for VPN environment and warn user
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.VERDENT_LLM_PROXY
    if (proxyUrl) {
      console.log('VPN/Proxy environment detected:', proxyUrl)
      return NextResponse.json(
        { 
          error: 'AI Summary is currently unavailable in VPN environment. Please disable VPN (如飞连) and try again.',
          vpnDetected: true,
          proxy: proxyUrl
        },
        { status: 503 }
      )
    }

    const { events, eventType, includeImages = false }: SummaryRequest = await request.json()

    if (!events || events.length === 0) {
      return NextResponse.json(
        { error: 'No events provided' },
        { status: 400 }
      )
    }

    // Filter events based on eventType
    const filteredEvents = eventType === 'all' 
      ? events 
      : events.filter(event => event.eventType === eventType)

    if (filteredEvents.length === 0) {
      return NextResponse.json(
        { error: `No ${eventType} events found` },
        { status: 400 }
      )
    }

    // Prepare content for AI analysis
    const messages: any[] = []
    
    // System prompt based on event type
    const systemPrompts = {
      browser: "You are an expert web interaction analyst. Analyze the browser events and provide insights about user behavior, navigation patterns, and web interactions. Include analysis of any screenshots if provided.",
      terminal: "You are an expert system administrator. Analyze the terminal events and provide insights about command usage, workflow patterns, and system operations.",
      file: "You are an expert file system analyst. Analyze the file operations and provide insights about file management patterns, workflow efficiency, and organizational behavior.",
      all: "You are an expert system behavior analyst. Analyze all system events comprehensively and provide insights about the overall user workflow, cross-system interactions, and behavioral patterns."
    }

    messages.push({
      role: "system",
      content: systemPrompts[eventType] + "\n\nProvide a clear, structured summary with:\n1. Overview of activities\n2. Key patterns and insights\n3. Notable events or anomalies\n4. Workflow analysis\n\nBe concise but informative."
    })

    // Prepare event text summary
    const eventSummary = filteredEvents.map(event => {
      const time = new Date(event.timestamp).toLocaleTimeString()
      let description = `[${time}] ${event.eventType.toUpperCase()} ${event.type}`
      
      if (event.eventType === 'browser') {
        if (event.type === 'click') {
          description += ` on ${event.element?.tagName || 'element'}`
          if (event.element?.text) description += ` "${event.element.text}"`
        } else if (event.type === 'navigation') {
          description += ` to ${event.url}`
        } else if (event.type === 'screenshot') {
          description += ` captured ${event.details?.width}x${event.details?.height}`
        } else if (event.type === 'console') {
          description += ` [${event.level}] ${event.args?.join(' ') || ''}`
        }
      } else if (event.eventType === 'terminal') {
        if (event.type === 'command') {
          description += ` "${event.details?.command}" in ${event.details?.workingDirectory}`
        } else if (event.type === 'output') {
          description += ` ${event.details?.outputLength} bytes`
        }
      } else if (event.eventType === 'file') {
        if (event.type === 'operation') {
          description += ` ${event.details?.operation} "${event.details?.fileName}"`
        } else if (event.type === 'navigation') {
          description += ` to ${event.details?.targetPath}`
        }
      }
      
      return description
    }).join('\n')

    // Create user message with text content
    const userContent: any[] = [
      {
        type: "text",
        text: `Please analyze these ${eventType} events (${filteredEvents.length} total):\n\n${eventSummary}`
      }
    ]

    // Add images if requested and available (for browser events with screenshots)
    if (includeImages && eventType !== 'terminal' && eventType !== 'file') {
      const screenshotEvents = filteredEvents.filter(event => 
        event.eventType === 'browser' && 
        event.type === 'screenshot' && 
        event.details?.imageData
      )

      screenshotEvents.forEach((event, index) => {
        if (event.details?.imageData) {
          userContent.push({
            type: "image_url",
            image_url: {
              url: event.details.imageData
            }
          })
        }
      })

      if (screenshotEvents.length > 0) {
        userContent[0].text += `\n\nI've also included ${screenshotEvents.length} screenshot(s) for visual context analysis.`
      }
    }

    messages.push({
      role: "user",
      content: userContent
    })

    // Call OpenRouter API with intelligent proxy fallback
    try {
      const response = await intelligentFetch(`${process.env.OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'User-Agent': 'AI-Summary/1.0',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-pro",
          messages: messages,
          max_tokens: parseInt(process.env.OPENROUTER_MAX_TOKENS || '1000'),
          temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE || '0.7'),
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      const summary = data.choices[0]?.message?.content || "Unable to generate summary"

      // Extract insights from the summary (simple extraction based on structure)
      const insights: string[] = []
      const lines = summary.split('\n').filter(line => line.trim())
      
      // Look for bullet points or numbered items as insights
      lines.forEach((line: string) => {
        if (line.match(/^[\d\-\*\•].+/) || line.includes('insight') || line.includes('pattern')) {
          insights.push(line.trim())
        }
      })

      return NextResponse.json({
        summary,
        insights: insights.slice(0, 5), // Limit to 5 key insights
        eventCount: filteredEvents.length,
        includeImages: includeImages && eventType !== 'terminal' && eventType !== 'file'
      })

    } catch (apiError: any) {
      console.error('OpenRouter API failed - Full error details:')
      console.error('Error type:', typeof apiError)
      console.error('Error message:', apiError.message)
      console.error('Error code:', apiError.code)
      console.error('Error stack:', apiError.stack)
      
      // Check if it's a network-related error
      if (apiError.code === 'ECONNREFUSED' || 
          apiError.code === 'ETIMEDOUT' || 
          apiError.code === 'ENOTFOUND' ||
          apiError.message?.includes('getaddrinfo') ||
          apiError.message?.includes('timeout') ||
          apiError.message?.includes('network')) {
        console.error('Network error detected - likely VPN/proxy issue')
      }
      
      // Simple network error message as requested
      throw new Error('Network error')
    }

  } catch (error: any) {
    console.error('AI Summary API Error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI summary.' },
      { status: 500 }
    )
  }
}