// Background script for the extension
// chrome variable is globally available in Chrome extensions

// Declare the chrome variable to fix lint/correctness/noUndeclaredVariables error
const chrome = window.chrome

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Recruiting Agent extension installed")
})

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id })
})
