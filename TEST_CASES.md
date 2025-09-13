# Comprehensive Test Cases for Vibe Coding Platform

## 1. Browser Component Tests

### 1.1 URL Navigation
**Test Case ID**: BR-001  
**Description**: Test URL input and navigation  
**Steps**:
1. Enter "example.com" in URL field
2. Click "Go" button
3. Verify page loads with https:// prefix added
4. Enter "https://github.com" 
5. Press Enter key
6. Verify GitHub page loads

**Expected Results**:
- URLs without protocol get https:// prefix
- Both button click and Enter key trigger navigation
- Page content displays in iframe
- Loading indicator shows during fetch

### 1.2 Navigation Controls
**Test Case ID**: BR-002  
**Description**: Test back/forward/refresh buttons  
**Steps**:
1. Navigate to page A
2. Navigate to page B
3. Click Back button
4. Verify page A is shown
5. Click Forward button
6. Verify page B is shown
7. Click Refresh button
8. Verify page reloads

**Expected Results**:
- Back button disabled when no history
- Forward button disabled when at latest page
- History maintained correctly
- Refresh reloads current page

### 1.3 Error Handling
**Test Case ID**: BR-003  
**Description**: Test invalid URL handling  
**Steps**:
1. Enter invalid URL "not-a-url"
2. Navigate to unreachable domain
3. Enter malformed URL "http://[invalid"

**Expected Results**:
- Error message displayed
- Previous content remains visible
- Browser remains functional

### 1.4 External Link
**Test Case ID**: BR-004  
**Description**: Test open in new tab  
**Steps**:
1. Navigate to any page
2. Click external link button
3. Verify new tab opens with URL

**Expected Results**:
- New browser tab opens
- Correct URL loaded in new tab

## 2. File Viewer Component Tests

### 2.1 Directory Navigation
**Test Case ID**: FV-001  
**Description**: Test directory browsing  
**Steps**:
1. Component loads with home directory
2. Click on a folder
3. Verify folder contents display
4. Click ".." to go to parent
5. Enter path "/usr/bin" and press Enter

**Expected Results**:
- Home directory shows on load
- Folder navigation works
- Parent directory navigation works
- Manual path entry works
- Files and folders sorted correctly

### 2.2 File Operations
**Test Case ID**: FV-002  
**Description**: Test file preview  
**Steps**:
1. Navigate to directory with text files
2. Click on a text file
3. Verify preview displays
4. Click on large file
5. Verify truncation message

**Expected Results**:
- Small files show full content
- Large files show truncated preview
- File size displayed correctly
- Non-text files handled gracefully

### 2.3 Permission Handling
**Test Case ID**: FV-003  
**Description**: Test restricted directory access  
**Steps**:
1. Navigate to "/root" (restricted)
2. Navigate to system directory
3. Try accessing permission-denied items

**Expected Results**:
- Error message for restricted directories
- Graceful handling of permission errors
- User informed of access issues

### 2.4 Path Input Validation
**Test Case ID**: FV-004  
**Description**: Test path input edge cases  
**Steps**:
1. Enter non-existent path
2. Enter file path instead of directory
3. Enter relative path "../"
4. Enter path with spaces

**Expected Results**:
- Error for non-existent paths
- File paths redirect to parent directory
- Relative paths resolved correctly
- Spaces in paths handled

## 3. Terminal Component Tests

### 3.1 Basic Commands
**Test Case ID**: TM-001  
**Description**: Test command execution  
**Steps**:
1. Type "ls" and press Enter
2. Type "pwd" and press Enter
3. Type "echo Hello World"
4. Type "date"

**Expected Results**:
- Commands execute successfully
- Output displayed correctly
- Prompt shows after each command
- Color coding for different outputs

### 3.2 Directory Navigation
**Test Case ID**: TM-002  
**Description**: Test cd command  
**Steps**:
1. Type "cd /tmp"
2. Verify prompt changes to /tmp
3. Type "cd .."
4. Type "cd ~"

**Expected Results**:
- Working directory changes
- Prompt updates with new path
- Relative paths work
- Home directory shortcut works

### 3.3 Command History
**Test Case ID**: TM-003  
**Description**: Test arrow key history  
**Steps**:
1. Execute several commands
2. Press Up arrow
3. Verify previous command appears
4. Press Down arrow
5. Press Up multiple times

**Expected Results**:
- Up arrow shows previous commands
- Down arrow navigates forward in history
- Command line editable from history
- History persists during session

### 3.4 Special Keys
**Test Case ID**: TM-004  
**Description**: Test keyboard shortcuts  
**Steps**:
1. Type partial command and press Ctrl+C
2. Type "clear" command
3. Use backspace to delete characters
4. Use left/right arrows to move cursor

**Expected Results**:
- Ctrl+C cancels current input
- Clear command clears terminal
- Backspace deletes characters
- Cursor movement works correctly

### 3.5 Error Handling
**Test Case ID**: TM-005  
**Description**: Test command errors  
**Steps**:
1. Type invalid command "notacommand"
2. Type command with syntax error
3. Execute long-running command
4. Try dangerous command like "rm -rf /"

**Expected Results**:
- Error messages in red
- Terminal remains functional after errors
- Timeout for long commands
- Dangerous commands blocked

## 4. Text Display Component Tests

### 4.1 Text Input
**Test Case ID**: TD-001  
**Description**: Test text editing  
**Steps**:
1. Type text in display area
2. Paste large text block
3. Use keyboard shortcuts (Ctrl+A, Ctrl+C)
4. Edit existing text

**Expected Results**:
- Text input works smoothly
- Large text handled well
- Standard shortcuts work
- Character count updates

### 4.2 Text Operations
**Test Case ID**: TD-002  
**Description**: Test copy/download/clear  
**Steps**:
1. Enter text and click Copy button
2. Paste elsewhere to verify
3. Click Download button
4. Click Clear button

**Expected Results**:
- Copy to clipboard works
- File downloads with timestamp
- Clear removes all text
- Statistics update correctly

### 4.3 Statistics Display
**Test Case ID**: TD-003  
**Description**: Test text statistics  
**Steps**:
1. Enter single line of text
2. Enter multi-line text
3. Enter text with special characters
4. Clear and verify stats reset

**Expected Results**:
- Character count accurate
- Line count accurate
- Word count accurate
- Stats update in real-time

## 5. Integration Tests

### 5.1 Component Interaction
**Test Case ID**: INT-001  
**Description**: Test components working together  
**Steps**:
1. Use file viewer to navigate to a directory
2. Copy path and use in terminal "cd" command
3. Run "ls" in terminal to verify same files
4. Open file in viewer, copy content to text display

**Expected Results**:
- Components share context appropriately
- Copy/paste between components works
- No conflicts between components

### 5.2 Layout and Responsiveness
**Test Case ID**: INT-002  
**Description**: Test responsive layout  
**Steps**:
1. Resize browser window
2. Test mobile view with tabs
3. Test panel resizing
4. Test in different browsers

**Expected Results**:
- Layout adapts to screen size
- Mobile tabs work correctly
- Panels resize smoothly
- Cross-browser compatibility

### 5.3 Performance Tests
**Test Case ID**: PERF-001  
**Description**: Test with heavy load  
**Steps**:
1. Navigate large directories (>1000 files)
2. Load large web page in browser
3. Execute multiple terminal commands rapidly
4. Paste very large text (>1MB)

**Expected Results**:
- No significant lag
- UI remains responsive
- Memory usage reasonable
- No crashes or freezes

## 6. API Tests

### 6.1 Files API
**Test Case ID**: API-001  
**Description**: Test /api/files endpoint  
**Steps**:
1. GET /api/files (home directory)
2. GET /api/files?path=/tmp
3. GET /api/files?path=/nonexistent
4. GET /api/files?path=/etc/passwd (file)

**Expected Results**:
- Returns directory listing
- Handles errors gracefully
- File content for files
- Proper error codes

### 6.2 Terminal API
**Test Case ID**: API-002  
**Description**: Test /api/terminal endpoint  
**Steps**:
1. POST with valid command
2. POST with invalid command
3. POST with dangerous command
4. POST with timeout command

**Expected Results**:
- Commands execute correctly
- Errors returned properly
- Dangerous commands blocked
- Timeouts handled

### 6.3 Proxy API
**Test Case ID**: API-003  
**Description**: Test /api/proxy endpoint  
**Steps**:
1. GET with valid URL
2. GET with invalid URL
3. GET without URL parameter
4. GET with HTTPS site

**Expected Results**:
- HTML content returned
- Errors for invalid URLs
- 400 for missing parameter
- HTTPS sites work

## 7. Security Tests

### 7.1 Command Injection
**Test Case ID**: SEC-001  
**Description**: Test command injection prevention  
**Steps**:
1. Terminal: Try "ls; rm -rf /"
2. File path: Try "../../../etc/passwd"
3. Browser URL: Try "javascript:alert(1)"

**Expected Results**:
- Dangerous commands blocked
- Path traversal prevented
- XSS prevented

### 7.2 Access Control
**Test Case ID**: SEC-002  
**Description**: Test file access restrictions  
**Steps**:
1. Try accessing system files
2. Try modifying protected files
3. Try executing privileged commands

**Expected Results**:
- Appropriate permission errors
- No unauthorized access
- Security boundaries maintained

## Test Execution Matrix

| Component | Critical | High | Medium | Low | Total |
|-----------|----------|------|--------|-----|-------|
| Browser   | 2        | 2    | 0      | 0   | 4     |
| File Viewer | 2      | 2    | 0      | 0   | 4     |
| Terminal  | 3        | 2    | 0      | 0   | 5     |
| Text Display | 1     | 2    | 0      | 0   | 3     |
| Integration | 2      | 1    | 0      | 0   | 3     |
| API       | 3        | 0    | 0      | 0   | 3     |
| Security  | 2        | 0    | 0      | 0   | 2     |

**Total Test Cases: 24**

## Automated Testing Script

```bash
#!/bin/bash
# test.sh - Automated test runner

echo "Starting Vibe Coding Platform Tests..."

# API Tests
echo "Testing Files API..."
curl -s http://localhost:3000/api/files | jq .
curl -s "http://localhost:3000/api/files?path=/tmp" | jq .

echo "Testing Terminal API..."
curl -X POST http://localhost:3000/api/terminal \
  -H "Content-Type: application/json" \
  -d '{"command":"ls","cwd":"/tmp"}' | jq .

echo "Testing Proxy API..."
curl -s "http://localhost:3000/api/proxy?url=example.com" | head -n 20

# Component Tests (requires Playwright or Cypress)
echo "Run UI tests with: npm run test:e2e"
```

## Manual Testing Checklist

- [ ] Browser loads pages correctly
- [ ] File viewer shows directories
- [ ] Terminal executes commands
- [ ] Text display saves/loads text
- [ ] All buttons responsive
- [ ] Error messages clear
- [ ] Performance acceptable
- [ ] Security measures work
- [ ] Mobile view functional
- [ ] Cross-browser tested

## Known Issues & Limitations

1. **Browser**: Some sites block iframe embedding
2. **Terminal**: No support for interactive programs (vim, nano)
3. **File Viewer**: Large directories may be slow
4. **General**: WebSocket not implemented for real-time terminal

## Test Environment

- **OS**: Linux/macOS/Windows
- **Node.js**: v18+
- **Browsers**: Chrome, Firefox, Safari, Edge
- **Screen Sizes**: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)