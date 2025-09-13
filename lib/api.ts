// Remove the Chrome reference type as it's causing build issues
// Instead we'll use a declaration file

// Safely detect Chrome extension environment - use a function to prevent build-time errors
function isChromeExtension(): boolean {
  try {
    return typeof window !== 'undefined' &&
           typeof (window as any).chrome !== 'undefined' &&
           typeof (window as any).chrome.runtime !== 'undefined' &&
           typeof (window as any).chrome.runtime.id === 'string';
  } catch {
    return false;
  }
}

// Authentication configuration
const CHROME_EXTENSION_CLIENT_ID =
  '258289407737-mdh4gleu91oug8f5g8jqkt75f62te9kv.apps.googleusercontent.com'; // for airecruitingagent.pythonanywhere.com

export const AUTH_CONFIG = {
  clientId: CHROME_EXTENSION_CLIENT_ID,              // <- explicit, no manifest dependency
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  scope: 'email profile',
  responseType: 'token id_token',
  // ⚠ remove redirectUri from here to avoid accidental use
};

// Auth token storage key
const TOKEN_STORAGE_KEY = "ai_recruiting_agent_auth";

// Auth token interface
interface AuthToken {
  accessToken: string;
  idToken: string;
  expiresAt: number;
}

function getBackendUrl(): string {
  // Try to get from window (injected during build)
  if (typeof window !== "undefined" && (window as any).__BACKEND_URL__) {
    return (window as any).__BACKEND_URL__
  }
  // Fallback to environment variable
  return process.env.BACKEND_URL || "http://localhost:8000"
}

// Get stored auth token
export async function getAuthToken(): Promise<AuthToken | null> {
  try {
    if (isChromeExtension() && (window as any).chrome?.storage) {
      return new Promise((resolve) => {
        (window as any).chrome.storage.local.get(TOKEN_STORAGE_KEY, (result: any) => {
          const token = result[TOKEN_STORAGE_KEY];
          if (token && token.expiresAt > Date.now()) {
            resolve(token);
          } else {
            resolve(null);
          }
        });
      });
    }
  } catch {
    // Ignore errors during build time
  }

  if (typeof window !== "undefined") {
    try {
      const tokenStr = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!tokenStr) return null;

      const token = JSON.parse(tokenStr);
      if (token && token.expiresAt > Date.now()) {
        return token;
      }
    } catch {
      // Ignore localStorage errors
    }
  }
  return null;
}

// Save auth token
export async function saveAuthToken(token: AuthToken): Promise<void> {
  try {
    if (isChromeExtension() && (window as any).chrome?.storage) {
      return new Promise((resolve) => {
        (window as any).chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: token }, resolve);
      });
    }
  } catch {
    // Ignore errors during build time
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
    } catch {
      // Ignore localStorage errors
    }
  }
}

// Clear auth token
export async function clearAuthToken(): Promise<void> {
  try {
    if (isChromeExtension() && (window as any).chrome?.storage) {
      return new Promise((resolve) => {
        (window as any).chrome.storage.local.remove(TOKEN_STORAGE_KEY, resolve);
      });
    }
  } catch {
    // Ignore errors during build time
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }
}

// Initiate Google OAuth login

function rand(n = 24): string {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  // Use Array.from to convert Uint8Array to number[] for String.fromCharCode
  return btoa(String.fromCharCode(...Array.from(arr)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}


export async function login(): Promise<AuthToken | null> {
  try {
    if (isChromeExtension() && (window as any).chrome?.identity) {
        const redirectUri = "https://airecruitingagent.pythonanywhere.com/oauth2cb";

      // Hard-code client id to avoid manifest/env fallbacks during debug
      const CLIENT_ID = CHROME_EXTENSION_CLIENT_ID;
      // Required when requesting id_token
      const state = rand();
      const nonce = rand();

      // Sanity checks & debug
      console.log("[OAuth] runtime.id:", (window as any).chrome.runtime.id);
      console.log("[OAuth] using redirectUri:", redirectUri);
      console.log("[OAuth] client_id:", CLIENT_ID);

      // Build the auth URL ONCE
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "token id_token",
        scope: "openid email profile",
        prompt: "consent",
        state,
        nonce,
      });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      console.log("[OAuth] authUrl:", authUrl);

      // Launch flow
      const responseUrl = await new Promise<string>((resolve, reject) => {
        (window as any).chrome.identity.launchWebAuthFlow(
          { url: authUrl, interactive: true },
          (redirectedTo?: string) => {
            console.log("[OAuth] redirectedTo:", redirectedTo);
            if ((window as any).chrome.runtime.lastError) {
              return reject(new Error((window as any).chrome.runtime.lastError.message));
            }
            if (!redirectedTo) return reject(new Error("No response URL returned from auth flow"));
            resolve(redirectedTo);
          }
        );
      });

      // Parse fragment (#...)
      const hash = (new URL(responseUrl)).hash.replace(/^#/, "");
      const q = new URLSearchParams(hash);

      // Handle errors first
      const err = q.get("error");
      if (err) {
        const desc = q.get("error_description") || "";
        console.error("[OAuth] error:", err, desc);
        return null;
      }

      // Validate state
      if (q.get("state") !== state) {
        console.error("[OAuth] state mismatch");
        return null;
      }

      const accessToken = q.get("access_token");
      const idToken = q.get("id_token");
      const expiresIn = q.get("expires_in");

      if (!accessToken || !idToken || !expiresIn) {
        console.error("Invalid authentication response:", { accessToken, idToken, expiresIn });
        return null;
      }

      const expiresAt = Date.now() + parseInt(expiresIn, 10) * 1000;
      const token = { accessToken, idToken, expiresAt };
      await saveAuthToken(token);
      return token;
    }
  } catch (e) {
    console.error("Login error:", e);
  }

  // Optional non-extension fallback (can be removed if unused)
  if (typeof window !== "undefined") {
    // This branch should rarely run in an extension context
    const fallbackRedirect = "/auth-callback.html";
    const params = new URLSearchParams({
      client_id: AUTH_CONFIG.clientId,
      redirect_uri: fallbackRedirect,
      response_type: "token id_token",
      scope: AUTH_CONFIG.scope,
      prompt: "consent",
    });
    window.location.href = `${AUTH_CONFIG.authUrl}?${params.toString()}`;
  }
  return null;
}

// Logout
export async function logout(): Promise<void> {
  await clearAuthToken();
}

// Create a completely new function with a different name
export async function checkUserAuthentication(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    // Use direct return of comparison result
    return token !== null;
  } catch (error) {
    console.error("Authentication check failed:", error);
    return false;
  }
}

// Keep the old function but clearly mark it as a function type
// export const isAuthenticated = async (): Promise<boolean> => {
//     try {
//         const token = await getAuthToken();
//         return token !== null;
//     } catch (error) {
//         console.error("Authentication check failed:", error);
//         return false;
//     }
// };

// Unified error handler for fetch responses
async function handleErrorResponse(res: Response): Promise<never> {
  // Clear token only on 401 (auth problem), not on 403 (authorization)
  if (res.status === 401) {
    await clearAuthToken();
  }

  let message: string | undefined;

  // Try JSON first — but don't throw inside this try/catch,
  // because it would be caught below and we'd lose the message.
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") {
        message = body.detail;
      } else if (typeof body?.message === "string") {
        message = body.message;
      } else if (body != null) {
        // last-resort: stringify the JSON object so we at least surface something useful
        message = JSON.stringify(body);
      }
    } catch {
      // fall through to text branch
    }
  }

  // If we still don't have a message (non-JSON or JSON parse failed), try text
  if (!message) {
    try {
      const text = await res.text();
      if (text) {
        message = text;
      }
    } catch {
      // ignore; we'll fall back to status code
    }
  }

  // Final fallback
  if (!message) {
    message = `HTTP ${res.status}`;
  }

  throw new Error(message);
}

// Helper to add auth token to fetch options
async function addAuthHeader(options: RequestInit = {}): Promise<RequestInit> {
  const token = await getAuthToken();
  // if (!token) {
  //   throw new Error("Please log in to continue");
  // }
  if (!token) {
    return options;
  }
  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token.idToken}`,
    },
  };
}

export async function postReviewWithRetry({
  jobDescription,
  url,
  demo,
}: { jobDescription: string; url: string; demo?: boolean }) {
  let lastError: Error

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await postReview({ jobDescription, url, demo })
      return response
    } catch (error) {
      lastError = error as Error

      // Don't retry on authentication errors
      if (error instanceof Error && (
          error.message.includes("Authentication required") ||
          error.message.includes("401") ||
          error.message.includes("403"))) {
        throw error
      }

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 2000)) // 2s delay
      }
    }
  }

  throw lastError!
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
    // Add authorization header
    const fetchOptions = await addAuthHeader({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_description: jobDescription,
        url: url,
        demo: demo || false,
      }),
      signal: controller.signal,
    });

    const res = await fetch(`${base}/review`, fetchOptions)

    clearTimeout(timeoutId)

    if (!res.ok) {
      await handleErrorResponse(res);
    }

    const textResponse = await res.text();

    try {
      // Parse the response text as JSON
      return JSON.parse(textResponse);
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", parseError);
      throw new Error("Invalid response format from server");
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    console.error("API error:", error instanceof Error ? error.message : String(error))
    throw error
  }
}

export async function postQuestions({
  qa_pairs,
  demo,
}: {
  qa_pairs: Array<{ question: string; answer: string }>;
  demo?: boolean;
}) {
  const base = getBackendUrl()
  console.log("[v0] postQuestions - Using backend URL:", base)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 150000) // 150s timeout

  try {
    // Add authorization header
    const fetchOptions = await addAuthHeader({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qa_pairs: qa_pairs,
        demo: demo || false
      }),
      signal: controller.signal,
    });

    const res = await fetch(`${base}/questions`, fetchOptions);

    clearTimeout(timeoutId)

    if (!res.ok) {
      await handleErrorResponse(res);
    }

    const textResponse = await res.text();

    try {
      // Parse the response text as JSON
      return JSON.parse(textResponse);
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", parseError);
      throw new Error("Invalid response format from server");
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    console.error("API error:", error instanceof Error ? error.message : String(error))
    throw error
  }
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
        // Remove <add>...</add> tags and keep content
        .replace(/<add>(.*?)<\/add>/gi, "$1")
        // Remove <span style="color:#...">...</span> and keep content
        .replace(/<span style="color:#[0-9a-f]+">(.*?)<\/span>/gi, "$1")
        // Remove any remaining HTML tags
        .replace(/<[^>]*>/g, "")
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
    if (isChromeExtension() && (window as any).chrome?.tabs) {
      const [tab] = await (window as any).chrome.tabs.query({ active: true, currentWindow: true });
      return tab?.url || (typeof window !== "undefined" ? window.location.href : "");
    }
  } catch {
    // Fallback for non-extension environment or during build
  }

  return typeof window !== "undefined" ? window.location.href : "";
}

export async function getJobDescription({ url, demo }: { url: string; demo?: boolean }) {
  const base = getBackendUrl()
  console.log("[v0] getJobDescription - Using backend URL:", base)
  console.log("[v0] getJobDescription - Request payload:", { url, demo })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

  try {
    const fullUrl = `${base}/jobdescription`
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
      hasPermissions: typeof chrome !== "undefined" && typeof (chrome as any).permissions !== "undefined",
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
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    console.log("[v0] getJobDescription - Fetch error details:", {
      name: error instanceof Error ? error.name : "Unknown error",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      console.log("[v0] getJobDescription - Likely CORS or network connectivity issue")
      console.log("[v0] getJobDescription - Check if backend server is running and CORS is configured")
    }

    throw error
  }
}

export async function manageResume({ action = "load" }: { action?: string } = {}) {
  const base = getBackendUrl()
  console.log("[v0] manageResume - Using backend URL:", base)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

  try {
    // Add authorization header
    const fetchOptions = await addAuthHeader({
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    // Changed query parameter from 'action' to 'command' to match backend API
    const res = await fetch(`${base}/resume?command=${action}`, fetchOptions)

    clearTimeout(timeoutId)
    console.log("[v0] manageResume - Response status:", res.status)

    if (!res.ok) {
      await handleErrorResponse(res);
    }

    const data = await res.json()
    console.log("[v0] manageResume - Success response received")

    // Check if response contains the expected 'resume' property
    if (!data.resume && !data.error) {
      console.error("[v0] manageResume - Unexpected response format:", data)
      throw new Error("Unexpected response format from server")
    }

    return data
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    console.error("API error:", error instanceof Error ? error.message : String(error))
    throw error
  }
}
