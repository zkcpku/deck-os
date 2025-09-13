import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }
    
    // Ensure URL has protocol
    let targetUrl = url
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }
    
    try {
      // Fetch the target URL
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        redirect: 'follow'
      })
      
      const contentType = response.headers.get('content-type') || 'text/html'
      
      // For HTML content, inject base tag to fix relative URLs
      if (contentType.includes('text/html')) {
        let html = await response.text()
        
        // Extract base URL from target
        const urlObj = new URL(targetUrl)
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`
        
        // Inject base tag if not present
        if (!html.includes('<base')) {
          html = html.replace('<head>', `<head><base href="${baseUrl}/">`)
        }
        
        // Replace relative URLs with absolute ones
        html = html.replace(/src=["'](?!http|\/\/)(\/)?([^"']+)["']/g, `src="${baseUrl}/$2"`)
        html = html.replace(/href=["'](?!http|\/\/|#)(\/)?([^"']+)["']/g, `href="${baseUrl}/$2"`)
        
        // Add CORS headers
        return new NextResponse(html, {
          status: response.status,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff'
          }
        })
      }
      
      // For other content types, return as-is
      const content = await response.arrayBuffer()
      return new NextResponse(content, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'X-Frame-Options': 'SAMEORIGIN',
          'X-Content-Type-Options': 'nosniff'
        }
      })
      
    } catch (fetchError: any) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${fetchError.message}` },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    return NextResponse.json(
      { error: `Proxy error: ${error.message}` },
      { status: 500 }
    )
  }
}