import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
})

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

    // Call OpenRouter API
    const response = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-pro",
      messages: messages,
      max_tokens: parseInt(process.env.OPENROUTER_MAX_TOKENS || '1000'),
      temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE || '0.7'),
    })

    const summary = response.choices[0]?.message?.content || "Unable to generate summary"

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

  } catch (error: any) {
    console.error('AI Summary API Error:', error)
    
    // Return more specific error messages
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'API quota exceeded. Please try again later.' },
        { status: 429 }
      )
    } else if (error.code === 'invalid_request_error') {
      return NextResponse.json(
        { error: 'Invalid request. Please check your input.' },
        { status: 400 }
      )
    } else {
      return NextResponse.json(
        { error: 'Failed to generate AI summary. Please try again.' },
        { status: 500 }
      )
    }
  }
}