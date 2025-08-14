document.addEventListener("DOMContentLoaded", () => {
  const openPanelBtn = document.getElementById("openPanel")
  const togglePanelBtn = document.getElementById("togglePanel")
  const status = document.getElementById("status")

  window.chrome = window.chrome || {}

  openPanelBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "openPanel" }, (response) => {
        if (chrome.runtime.lastError) {
          status.textContent = "Please refresh the page and try again"
        } else {
          status.textContent = "Panel opened successfully"
          window.close()
        }
      })
    })
  })

  togglePanelBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "togglePanel" }, (response) => {
        if (chrome.runtime.lastError) {
          status.textContent = "Please refresh the page and try again"
        } else {
          status.textContent = "Panel toggled"
          window.close()
        }
      })
    })
  })
})
