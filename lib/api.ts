// Declare chrome variable to fix lint/correctness/noUndeclaredVariables error
declare const chrome: any

export async function postReview({ jobDescription, url }: { jobDescription: string; url: string }) {
  let base: string

  try {
    // Try to get backend URL from chrome storage if available
    if (typeof chrome !== "undefined" && chrome.storage) {
      const result = await chrome.storage.sync.get("backendUrl")
      base = result?.backendUrl || process.env.BACKEND_URL || "http://localhost:8000"
    } else {
      base = process.env.BACKEND_URL || "http://localhost:8000"
    }
  } catch {
    base = process.env.BACKEND_URL || "http://localhost:8000"
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 150000) // 150s timeout

  try {
    const res = await fetch(`${base}/generate/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_description: jobDescription,
        url: url,
        save_output: true,
        demo: false,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    return res.json()
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export async function postQuestions({
  questionsAnswers,
}: { questionsAnswers: Array<{ Question: string; Answer: string }> }) {
  let base: string

  try {
    if (typeof chrome !== "undefined" && chrome.storage) {
      const result = await chrome.storage.sync.get("backendUrl")
      base = result?.backendUrl || process.env.BACKEND_URL || "http://localhost:8000"
    } else {
      base = process.env.BACKEND_URL || "http://localhost:8000"
    }
  } catch {
    base = process.env.BACKEND_URL || "http://localhost:8000"
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

  try {
    const res = await fetch(`${base}/generate/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Questions_Answers: questionsAnswers,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    return res.json()
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export async function postReviewWithRetry({ jobDescription, url }: { jobDescription: string; url: string }) {
  let lastError: Error

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await postReview({ jobDescription, url })
    } catch (error) {
      lastError = error as Error
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 2000)) // 2s delay
      }
    }
  }

  throw lastError!
}

export function cleanMarkdown(md: string): string {
  if (!md) return md

  try {
    return (
      md
        // Remove <del>...</del> tags
        .replace(/<del[^>]*>.*?<\/del>/gi, "")
        // Remove <ins>...</ins> tags and keep content
        .replace(/<ins[^>]*>(.*?)<\/ins>/gi, "$1")
        // Remove markdown strikethrough ~~...~~
        .replace(/~~(.*?)~~/g, "")
        // Remove <span class="add">...</span> and keep content
        .replace(/<span\s+class=["']add["'][^>]*>(.*?)<\/span>/gi, "$1")
        // Remove <span class="del">...</span>
        .replace(/<span\s+class=["']del["'][^>]*>.*?<\/span>/gi, "")
        // Clean up extra whitespace
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        .trim()
    )
  } catch {
    return md
  }
}

export async function getCurrentTabUrl(): Promise<string> {
  try {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      return tab?.url || window.location.href
    }
  } catch {
    // Fallback for non-extension environment
  }

  return window.location.href
}

export async function getJobDescription({ url }: { url: string }) {
  let base: string

  try {
    // Try to get backend URL from chrome storage if available
    if (typeof chrome !== "undefined" && chrome.storage) {
      const result = await chrome.storage.sync.get("backendUrl")
      base = result?.backendUrl || process.env.BACKEND_URL || "http://localhost:8000"
    } else {
      base = process.env.BACKEND_URL || "http://localhost:8000"
    }
  } catch {
    base = process.env.BACKEND_URL || "http://localhost:8000"
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

  try {
    const res = await fetch(`${base}/get_JD`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: url,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    return res.json()
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}
