// Content script that injects the React panel into web pages
let panelInjected = false
let panelVisible = false

// Don't declare chrome variable, as it is already a global object in the extension context
// const chrome = window.chrome

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openPanel") {
    if (!panelInjected) {
      injectPanel()
    }
    showPanel()
    sendResponse({ success: true })
  } else if (request.action === "togglePanel") {
    if (!panelInjected) {
      injectPanel()
    }
    togglePanel()
    sendResponse({ success: true })
  }
})

function injectPanel() {
  if (panelInjected) return

  // Create iframe for the React panel
  const iframe = document.createElement("iframe")
  iframe.id = "ai-recruiting-panel"
  iframe.src = chrome.runtime.getURL("panel.html")
  iframe.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    width: 384px !important;
    height: 100vh !important;
    border: none !important;
    z-index: 2147483647 !important;
    background: white !important;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1) !important;
    display: none !important;
  `

  document.body.appendChild(iframe)
  panelInjected = true

  // Handle messages from the iframe
  window.addEventListener("message", (event) => {
    if (event.data.type === "CLOSE_PANEL") {
      hidePanel()
    } else if (event.data.type === "GET_PAGE_URL") {
      iframe.contentWindow.postMessage(
        {
          type: "PAGE_URL_RESPONSE",
          url: window.location.href,
        },
        "*",
      )
    }
  })
}

function showPanel() {
  const panel = document.getElementById("ai-recruiting-panel")
  if (panel) {
    panel.style.display = "block"
    panelVisible = true
  }
}

function hidePanel() {
  const panel = document.getElementById("ai-recruiting-panel")
  if (panel) {
    panel.style.display = "none"
    panelVisible = false
  }
}

function togglePanel() {
  if (panelVisible) {
    hidePanel()
  } else {
    showPanel()
  }
}

// Auto-inject on certain job sites
if (
  window.location.hostname.includes("linkedin.com") ||
  window.location.hostname.includes("indeed.com") ||
  window.location.hostname.includes("glassdoor.com")
) {
  setTimeout(() => {
    injectPanel()
  }, 2000)
}
