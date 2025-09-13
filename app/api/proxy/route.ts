import { NextRequest, NextResponse } from 'next/server'

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

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
        
        // Event capture script and styles for better scrolling
        const eventCaptureScript = `
          <style>
            html, body {
              overflow: auto !important;
              height: auto !important;
              min-height: 100% !important;
            }
            /* Custom scrollbar styles */
            ::-webkit-scrollbar {
              width: 12px;
              height: 12px;
            }
            ::-webkit-scrollbar-track {
              background: #f1f1f1;
            }
            ::-webkit-scrollbar-thumb {
              background: #888;
              border-radius: 6px;
            }
            ::-webkit-scrollbar-thumb:hover {
              background: #555;
            }
          </style>
          <script>
            (function() {
              // Generate unique event ID
              const generateEventId = () => {
                return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
              };

              // Capture all browser events
              const captureEvent = (type, element, details) => {
                const eventData = {
                  id: generateEventId(),
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

              // Click events (use capture phase to ensure correct timing)
              document.addEventListener('click', (e) => {
                captureEvent('click', e.target, {
                  x: e.clientX,
                  y: e.clientY,
                  button: e.button
                });
              }, true); // true = capture phase

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

              // Console interception
              const originalConsole = {
                log: console.log,
                warn: console.warn,
                error: console.error,
                info: console.info,
                debug: console.debug
              };

              const createConsoleProxy = (level) => {
                return function(...args) {
                  // Call original console method
                  originalConsole[level].apply(console, args);
                  
                  try {
                    // Safely serialize arguments
                    const serializedArgs = args.map(arg => {
                      try {
                        if (typeof arg === 'object' && arg !== null) {
                          return JSON.stringify(arg, null, 2);
                        }
                        return String(arg);
                      } catch (e) {
                        return '[Object]';
                      }
                    });

                    // Get stack trace
                    const stack = new Error().stack || '';
                    
                    // Create console event
                    const consoleEvent = {
                      id: generateEventId(),
                      type: 'console',
                      timestamp: new Date().toISOString(),
                      element: {
                        tagName: 'CONSOLE',
                        id: '',
                        className: '',
                        text: serializedArgs.join(' '),
                        href: '',
                        src: ''
                      },
                      details: {
                        level: level,
                        args: serializedArgs,
                        stack: stack.split('\\n').slice(1, 4).join('\\n') // First 3 stack frames
                      },
                      url: window.location.href,
                      level: level,
                      args: serializedArgs,
                      stack: stack.split('\\n').slice(1, 4).join('\\n')
                    };
                    
                    // Send to parent window
                    window.parent.postMessage({
                      type: 'browser-event',
                      data: consoleEvent
                    }, '*');
                  } catch (e) {
                    // Silently fail to avoid breaking the page
                  }
                };
              };

              // Override console methods
              console.log = createConsoleProxy('log');
              console.warn = createConsoleProxy('warn');
              console.error = createConsoleProxy('error');
              console.info = createConsoleProxy('info');
              console.debug = createConsoleProxy('debug');
              
              // Intercept fetch requests to route through proxy
              const originalFetch = window.fetch;
              const proxyOrigin = window.parent.location.origin; // Get the parent frame's origin (our app)
              
              window.fetch = function(url, options) {
                // Skip if already going through proxy
                if (typeof url === 'string' && url.includes('/api/proxy')) {
                  return originalFetch.apply(this, arguments);
                }
                
                // Convert relative URLs to absolute
                let targetUrl = url;
                if (typeof url === 'string') {
                  // Handle different URL formats
                  if (url.startsWith('//')) {
                    targetUrl = window.location.protocol + url;
                  } else if (url.startsWith('/')) {
                    // Get the real origin from the page, not the proxy origin
                    const baseElement = document.querySelector('base');
                    const realOrigin = baseElement ? new URL(baseElement.href).origin : '${baseUrl}';
                    targetUrl = realOrigin + url;
                  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    // Relative URL - resolve against current page URL
                    const baseElement = document.querySelector('base');
                    const baseUrl = baseElement ? baseElement.href : '${baseUrl}/';
                    targetUrl = new URL(url, baseUrl).href;
                  }
                  
                  // Always proxy external requests through our server
                  if (!targetUrl.startsWith(proxyOrigin)) {
                    // Use the parent window's origin for the proxy
                    return originalFetch(proxyOrigin + '/api/proxy?url=' + encodeURIComponent(targetUrl), {
                      ...options,
                      mode: 'cors',
                      credentials: 'omit'
                    });
                  }
                }
                return originalFetch.apply(this, arguments);
              };
              
              // Also intercept XMLHttpRequest
              const originalXhrOpen = XMLHttpRequest.prototype.open;
              XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                // Skip if already going through proxy
                if (typeof url === 'string' && url.includes('/api/proxy')) {
                  return originalXhrOpen.call(this, method, url, async, user, password);
                }
                
                let targetUrl = url;
                if (typeof url === 'string') {
                  // Handle different URL formats
                  if (url.startsWith('//')) {
                    targetUrl = window.location.protocol + url;
                  } else if (url.startsWith('/')) {
                    // Get the real origin from the page, not the proxy origin
                    const baseElement = document.querySelector('base');
                    const realOrigin = baseElement ? new URL(baseElement.href).origin : '${baseUrl}';
                    targetUrl = realOrigin + url;
                  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    // Relative URL - resolve against current page URL
                    const baseElement = document.querySelector('base');
                    const baseUrl = baseElement ? baseElement.href : '${baseUrl}/';
                    targetUrl = new URL(url, baseUrl).href;
                  }
                  
                  // Always proxy external requests through our server
                  if (!targetUrl.startsWith(proxyOrigin)) {
                    // Use the parent window's origin for the proxy
                    targetUrl = proxyOrigin + '/api/proxy?url=' + encodeURIComponent(targetUrl);
                  }
                }
                return originalXhrOpen.call(this, method, targetUrl, async, user, password);
              };
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
      
      // For JSON/API responses, add CORS headers
      if (contentType.includes('application/json')) {
        const content = await response.text()
        return new NextResponse(content, {
          status: response.status,
          headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        })
      }
      
      // For other content types, return as-is with CORS headers
      const content = await response.arrayBuffer()
      return new NextResponse(content, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
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