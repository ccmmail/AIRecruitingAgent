// Declare chrome variable to fix lint/correctness/noUndeclaredVariables error
declare const chrome: any

function getBackendUrl(): string {
  // Try to get from window (injected during build)
  if (typeof window !== "undefined" && (window as any).__BACKEND_URL__) {
    return (window as any).__BACKEND_URL__
  }
  // Fallback to environment variable
  return process.env.BACKEND_URL || "http://localhost:8000"
}

export async function postReview({
  jobDescription,
  url,
  demo,
}: { jobDescription: string; url: string; demo?: boolean }) {
  const base = getBackendUrl()
  console.log("[v0] postReview - Using backend URL:", base)

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
        demo: demo || false,
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
  const base = getBackendUrl()
  console.log("[v0] postQuestions - Using backend URL:", base)

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

export async function postReviewWithRetry({
  jobDescription,
  url,
  demo,
}: { jobDescription: string; url: string; demo?: boolean }) {
  let lastError: Error

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await postReview({ jobDescription, url, demo })
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

export async function getJobDescription({ url, demo }: { url: string; demo?: boolean }) {
  const base = getBackendUrl()
  console.log("[v0] getJobDescription - Using backend URL:", base)
  console.log("[v0] getJobDescription - Request payload:", { url, demo })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

  try {
    const fullUrl = `${base}/get_JD`
    console.log("[v0] getJobDescription - Full URL:", fullUrl)

    const fetchOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url: url,
        demo: demo || false,
      }),
      signal: controller.signal,
      mode: "cors" as RequestMode,
      credentials: "omit" as RequestCredentials,
    }

    console.log("[v0] getJobDescription - Fetch options:", fetchOptions)
    console.log("[v0] getJobDescription - Extension context check:", {
      isExtension: typeof chrome !== "undefined",
      hasPermissions: typeof chrome !== "undefined" && chrome.permissions,
      userAgent: navigator.userAgent,
    })

    const res = await fetch(fullUrl, fetchOptions)

    clearTimeout(timeoutId)
    console.log("[v0] getJobDescription - Response status:", res.status)
    console.log("[v0] getJobDescription - Response headers:", Object.fromEntries(res.headers.entries()))

    if (!res.ok) {
      const errorText = await res.text()
      console.log("[v0] getJobDescription - Error response:", errorText)
      throw new Error(`HTTP ${res.status}: ${errorText}`)
    }

    const data = await res.json()
    console.log("[v0] getJobDescription - Success response:", data)
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    console.log("[v0] getJobDescription - Fetch error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })

    if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
      console.log("[v0] getJobDescription - Likely CORS or network connectivity issue")
      console.log("[v0] getJobDescription - Check if backend server is running and CORS is configured")
    }

    throw error
  }
}
