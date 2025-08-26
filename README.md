# AI Recruiting Agent - Chrome Extension

A Chrome extension that helps with job applications by analyzing job descriptions and tailoring resumes using AI.

## Development Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Build the extension:
\`\`\`bash
npm run build
\`\`\`

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `dist` folder
   - The extension should now appear in your extensions list

## Usage

1. Navigate to any job posting website (LinkedIn, Indeed, etc.)
2. Click the extension icon in the toolbar or use the popup
3. Click "Open Assistant Panel" to launch the AI assistant
4. Paste the job description and get AI-powered resume recommendations

## Development

- `npm run build` - Build the extension once
- `npm run dev` - Build and watch for changes

## Files Structure

- `manifest.json` - Extension manifest
- `popup.html/js` - Extension popup interface
- `content.js` - Content script injected into web pages
- `background.js` - Background service worker
- `panel.html` - Main React-based panel interface
- `build.js` - Build script to prepare extension files

## Features

- Job description analysis
- Resume tailoring suggestions
- Redline editing interface
- Copy/download functionality
- Demo mode for testing
