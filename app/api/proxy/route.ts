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
        
        // Event capture script
        const eventCaptureScript = `
          <script>
            (function() {
              // Capture all browser events
              const captureEvent = (type, element, details) => {
                const eventData = {
                  type: type,
                  timestamp: new Date().toISOString(),
                  element: {
                    tagName: element.tagName,
                    id: element.id || '',
                    className: element.className || '',
                    text: element.textContent?.substring(0, 100) || '',
                    href: element.href || '',
                    src: element.src || ''
                  },
                  details: details,
                  url: window.location.href
                };
                
                // Send to parent window
                window.parent.postMessage({
                  type: 'browser-event',
                  data: eventData
                }, '*');
              };

              // Click events
              document.addEventListener('click', (e) => {
                captureEvent('click', e.target, {
                  x: e.clientX,
                  y: e.clientY,
                  button: e.button
                });
              });

              // Form submissions
              document.addEventListener('submit', (e) => {
                captureEvent('submit', e.target, {
                  formData: Array.from(new FormData(e.target)).map(([k,v]) => ({key: k, value: v.toString().substring(0, 50)}))
                });
              });

              // Input changes
              document.addEventListener('input', (e) => {
                captureEvent('input', e.target, {
                  value: e.target.value?.substring(0, 100) || ''
                });
              });

              // Page navigation
              window.addEventListener('beforeunload', () => {
                captureEvent('navigate', document.body, {
                  from: window.location.href
                });
              });

              // Scroll events (throttled)
              let scrollTimeout;
              window.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                  captureEvent('scroll', document.body, {
                    scrollX: window.scrollX,
                    scrollY: window.scrollY
                  });
                }, 200);
              });

              // Key presses (excluding modifiers)
              document.addEventListener('keydown', (e) => {
                if (e.key !== 'Tab' && e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') {
                  captureEvent('keypress', e.target, {
                    key: e.key,
                    code: e.code,
                    ctrlKey: e.ctrlKey,
                    shiftKey: e.shiftKey,
                    altKey: e.altKey
                  });
                }
              });

              // Focus events
              document.addEventListener('focus', (e) => {
                captureEvent('focus', e.target, {});
              }, true);

              document.addEventListener('blur', (e) => {
                captureEvent('blur', e.target, {});
              }, true);
            })();
          </script>
        `;
        
        // Inject base tag and event capture script
        if (!html.includes('<base')) {
          html = html.replace('<head>', `<head><base href="${baseUrl}/">${eventCaptureScript}`)
        } else {
          html = html.replace('<head>', `<head>${eventCaptureScript}`)
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