// Background script for the extension

const chrome = require("chrome") // Declare the chrome variable

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Recruiting Agent extension installed")
})

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id })
})
