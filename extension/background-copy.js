const chrome = window.chrome

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Recruiting Agent extension installed")
})

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "togglePanel" })
})
