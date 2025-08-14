// Background script for the extension
// Declare the chrome variable
const chrome = window.chrome

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Recruiting Agent extension installed")
})

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id })
})
