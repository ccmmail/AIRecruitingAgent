"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { FileText, CheckCircle, AlertCircle, Linkedin, Loader2, Copy, Send, LogIn, LogOut, User } from "lucide-react"
import {
  postReviewWithRetry,
  postQuestions,
  cleanMarkdown,
  getCurrentTabUrl,
  getJobDescription,
  manageResume,
  login,
  logout,
  getAuthToken,
    checkUserAuthentication
} from "@/lib/api"
import { ResumeRenderer } from "@/components/resume-renderer"
import { Tooltip } from "@/components/tooltip"

// Browser extension environment detection - use a function to prevent build-time errors
function isBrowserExtension(): boolean {
  try {
    return typeof window !== 'undefined' &&
           typeof (window as any).chrome !== 'undefined' &&
           typeof (window as any).chrome.runtime !== 'undefined' &&
           typeof (window as any).chrome.runtime.id === 'string';
  } catch {
    return false;
  }
}

interface ReviewData {
  Tailored_Resume: string
  Fit: {
    score: number
    rationale: string
  }
  Gap_Map: Array<{
    "JD Requirement/Keyword": string
    "Present in Resume?": "Y" | "N"
    "Where/Evidence": string
    "Gap handling": string
  }>
  Questions: string[]
}

export default function Component() {
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("job-description")
  const [jobDescription, setJobDescription] = useState("")
  const [activeTabUrl, setActiveTabUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewData | null>(null)
  const [tailoredMarkdown, setTailoredMarkdown] = useState("")
  const [showRedlines, setShowRedlines] = useState(true)
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({})
  const [isSubmittingQuestions, setIsSubmittingQuestions] = useState(false)
  const [questionsSubmitted, setQuestionsSubmitted] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [showJDTooltip, setShowJDTooltip] = useState(true)
  const [showReviewTooltip, setShowReviewTooltip] = useState(true)
  const [showResumeTooltip, setShowResumeTooltip] = useState(true)
  const [showEditingTooltip, setShowEditingTooltip] = useState(true)
  const [demoState, setDemoState] = useState(true)
  const [initialResume, setInitialResume] = useState("")
  const [isLoadingResume, setIsLoadingResume] = useState(true)
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Reusable auth gate for API actions (keeps UX consistent)
  const ensureAuthenticated = (opts?: { withLoading?: boolean }): boolean => {
    if (!isAuthenticated) {
      setError("Please login in first and try again.");
      if (opts?.withLoading) {
        setIsLoading(false);
      }
      return false;
    }
    return true;
  };

// Reusable auth error handler (returns true if handled)
const handleAuthError = (err: any): boolean => {
  if (err?.message?.includes("401")) {
    setIsAuthenticated(false);
    setError(err.message); // surface backend message verbatim
    return true; // handled
  }
  return false; // not handled
};

  // Safely check authentication only in client side
  useEffect(() => {
    // Skip authentication check during server-side rendering
    if (typeof window === 'undefined') return;

    const checkAuth = async () => {
      try {
        const authStatus = await checkUserAuthentication();
        setIsAuthenticated(authStatus);

        if (authStatus) {
          const token = await getAuthToken();
          if (token) {
            try {
              // Parse JWT to get user info
              const tokenPayload = JSON.parse(atob(token.idToken.split('.')[1]));
              setUserEmail(tokenPayload.email);
            } catch (e) {
              console.error("Error parsing token payload:", e);
            }
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      console.log("Starting login process...");
      const result = await login();
      if (result) {
        console.log("Login successful. Token received:", result);
        setIsAuthenticated(true);
        const tokenPayload = JSON.parse(atob(result.idToken.split('.')[1]));
        setUserEmail(tokenPayload.email);
      } else {
        console.error("Login failed: No result returned");
        setAuthError("Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setAuthError(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setUserEmail(null);
  };

  // Clear authentication errors when authenticated state changes
  useEffect(() => {
    // If the user becomes authenticated, clear any auth-related errors
    if (isAuthenticated) {
      setError((prevError) => {
        if (prevError && (
          prevError.includes("authentication") ||
          prevError.includes("login") ||
          prevError.includes("authorized")
        )) {
          return null;
        }
        return prevError;
      });
    }
  }, [isAuthenticated]);

  // Handle initialization
  useEffect(() => {
    // Skip initialization during server-side rendering
    if (typeof window === 'undefined') {
      setIsInitialLoading(false);
      return;
    }

    const initializePanel = async () => {
      try {
        const url = await getCurrentTabUrl()
        setActiveTabUrl(url)

        // Then, proceed with the job description loading
        if (demoState) {
          console.log("[v0] Demo_State is true, getting demo job description")
          const jdResponse = await getJobDescription({ url: url, demo: true })
          console.log("[v0] API response:", jdResponse)
          if (jdResponse?.job_description) {
            setJobDescription(jdResponse.job_description)
            console.log("[v0] Demo job description loaded:", jdResponse.job_description.substring(0, 100))
          } else {
            console.log("[v0] No job description in response")
          }
        }
      } catch (error) {
        console.log("[v0] Failed to initialize panel:", error)
        setInitError(error instanceof Error ? error.message : "Failed to load demo job description")

        try {
          const url = await getCurrentTabUrl()
          setActiveTabUrl(url)
        } catch {
          setActiveTabUrl(window.location.href)
        }
      } finally {
        setIsInitialLoading(false)
      }
    }

    initializePanel()
  }, [demoState])

  // Handle tab changes, especially for Resume tab
  const handleTabChange = async (val: string) => {
    // Switch the active tab immediately
    setActiveTab(val);

    // Only special-case the Resume tab
    if (val !== "resume") return;

    // 1) If not logged in, show an error and stop
    if (!isAuthenticated) {
      setError("Please login first to view your resume.");
      return;
    }

    // 2) If a resume is already loaded in state, do nothing
    const hasResume = Boolean(tailoredMarkdown || initialResume);
    if (hasResume) return;

    // 3) Otherwise, load resume from backend
    setIsLoadingResume(true);
    setError(null);
    try {
      const response = await manageResume({ action: "load" });
      if (response?.resume) {
        setInitialResume(response.resume);
        if (!tailoredMarkdown) setTailoredMarkdown(response.resume);
      } else if (response?.error) {
        setError(response.error);
      } else {
        setError("No resume available for this account.");
      }
    } catch (err: any) {
      if (!handleAuthError(err)) {
        setError(err?.message || "Failed to load resume.");
      }
    } finally {
      setIsLoadingResume(false);
    }
  };

  const getFitScoreStyle = (score: number | null) => {
    if (score === null) return "bg-gray-200 text-gray-800"
    if (score >= 9) return "bg-green-800 text-white"
    if (score >= 7) return "bg-green-200 text-green-800"
    if (score >= 5) return "bg-orange-200 text-orange-800"
    if (score >= 3) return "bg-red-200 text-red-800"
    return "bg-red-800 text-white"
  }

  // Helper function to process API response and update UI
  const handleApiResponse = async (apiCall: Promise<any>) => {
    setError(null)

    try {
      const result = await apiCall

      console.log("[v0] API response received:", result)
      console.log("[v0] Response type:", typeof result)
      console.log("[v0] Response keys:", result ? Object.keys(result) : "null")

      // if (result) {
      //   console.log("[v0] Fit object exists:", !!result.Fit)
      //   console.log("[v0] Fit.score:", result.Fit?.score)
      //   console.log("[v0] Fit.rationale length:", result.Fit?.rationale?.length)
      //   console.log("[v0] Gap_Map exists:", !!result.Gap_Map)
      //   console.log("[v0] Gap_Map is array:", Array.isArray(result.Gap_Map))
      //   console.log("[v0] Gap_Map length:", result.Gap_Map?.length)
      //   console.log("[v0] Questions exists:", !!result.Questions)
      //   console.log("[v0] Questions is array:", Array.isArray(result.Questions))
      //   console.log("[v0] Questions length:", result.Questions?.length)
      //   console.log("[v0] Tailored_Resume exists:", !!result.Tailored_Resume)
      //   console.log("[v0] Tailored_Resume length:", result.Tailored_Resume?.length)
      // }

      if (result && typeof result === "object") {
        if (!result.Fit || typeof result.Fit.score !== "number") {
          console.log("[v0] Warning: Invalid Fit object in response")
        }
        if (!result.Gap_Map || !Array.isArray(result.Gap_Map)) {
          console.log("[v0] Warning: Invalid Gap_Map in response")
        }
        if (!result.Questions || !Array.isArray(result.Questions)) {
          console.log("[v0] Warning: Invalid Questions in response")
        }

        console.log("[v0] Setting review state...")
        setReview(result)

        setTimeout(() => {
          console.log("[v0] Review state verification - review exists:", !!result)
          console.log("[v0] Review state verification - Fit exists:", !!result?.Fit)
          console.log("[v0] Review state verification - score:", result?.Fit?.score)
        }, 100)

        if (result.Tailored_Resume) {
          setTailoredMarkdown(result.Tailored_Resume)
          console.log("[v0] Tailored resume set, length:", result.Tailored_Resume.length)
        }
        setActiveTab("review")
        console.log("[v0] Switched to review tab")
      } else {
        console.log("[v0] Invalid response format:", result)
        throw new Error("Invalid response format from server")
      }

      return result
    } catch (err) {
      console.log("[v0] API request failed:", err)
      setError(err instanceof Error ? err.message : "Failed to process response")
      return null
    }
  }

  const handleSendToReview = async () => {
    if (!jobDescription.trim()) return

    setIsLoading(true)
    setError(null)
    setReview(null)

    try {
      console.log("[v0] Sending review request with demo state:", demoState)
      console.log("[v0] Job description length:", jobDescription.trim().length)
      console.log("[v0] Active tab URL:", activeTabUrl)

      if (!ensureAuthenticated({ withLoading: true })) return;

      try {
        const response = await postReviewWithRetry({
          jobDescription: jobDescription.trim(),
          url: activeTabUrl,
          demo: demoState,
        });

        await handleApiResponse(Promise.resolve(response));
        } catch (err: any) {
          if (!handleAuthError(err)) {
            throw err; // rethrow non-auth errors
          }
        }
    } catch (err) {
      console.log("[v0] Review request failed:", err)
      setError(err instanceof Error ? err.message : "Failed to generate review")
    } finally {
      setIsLoading(false)
      console.log("[v0] Loading state cleared")
    }
  }

  const handleSubmitQuestions = async () => {
    if (!review?.Questions) return;

    if (!ensureAuthenticated()) return;

    const qa_pairs = review.Questions.map((question, index) => ({
      question: question,
      answer: questionAnswers[index] || "",
    }));

    setIsSubmittingQuestions(true);
    setError(null);

    try {
      const result = await handleApiResponse(
        postQuestions({
          qa_pairs,
          demo: demoState
        })
      );

      if (result) {
        // Clear the user input in the text fields after successful response
        setQuestionAnswers({});
      }
    } catch (err: any) {
      if (!handleAuthError(err)) {
        throw err; // rethrow non-auth errors
      }
    } finally {
      setIsSubmittingQuestions(false);
    }
  }

  const handleAcceptChange = (changeId: string, originalMarkup: string) => {
    let updatedMarkdown = tailoredMarkdown

    if (changeId.startsWith("del-")) {
      updatedMarkdown = updatedMarkdown.replace(originalMarkup, "")
    } else if (changeId.startsWith("add-")) {
      const textMatch = originalMarkup.match(/<add>(.*?)<\/add>/)
      if (textMatch) {
        updatedMarkdown = updatedMarkdown.replace(originalMarkup, textMatch[1])
      } else {
        const spanMatch = originalMarkup.match(/<span[^>]*>(.*?)<\/span>/)
        if (spanMatch) {
          updatedMarkdown = updatedMarkdown.replace(originalMarkup, spanMatch[1])
        }
      }
    }

    setTailoredMarkdown(updatedMarkdown)
  }

  const handleRejectChange = (changeId: string, originalMarkup: string) => {
    let updatedMarkdown = tailoredMarkdown

    if (changeId.startsWith("del-")) {
      const textMatch = originalMarkup.match(/<del>(.*?)<\/del>/)
      if (textMatch) {
        updatedMarkdown = updatedMarkdown.replace(originalMarkup, textMatch[1])
      }
    } else if (changeId.startsWith("add-")) {
      updatedMarkdown = updatedMarkdown.replace(originalMarkup, "")
    }

    setTailoredMarkdown(updatedMarkdown)
  }

  const handleEditChange = (changeId: string, originalMarkup: string, newText: string) => {
    const updatedMarkdown = tailoredMarkdown.replace(originalMarkup, newText)
    setTailoredMarkdown(updatedMarkdown)
  }

  const handleCopyMarkdown = async () => {
    if (!tailoredMarkdown && !initialResume) return

    try {
      // Always copy clean version without markdown
      const contentToCopy = cleanMarkdown(tailoredMarkdown || initialResume)
      await navigator.clipboard.writeText(contentToCopy)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch (err) {
      console.log("[v0] Failed to copy to clipboard:", err)
    }
  }

  // Remove handleDownloadMarkdown function since we're removing the download button

  useEffect(() => {
    const textarea = document.getElementById("job-description") as HTMLTextAreaElement
    if (textarea && jobDescription && textarea.value !== jobDescription) {
      textarea.value = jobDescription
      console.log("[v0] Textarea updated with job description")
    }
  }, [jobDescription])

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-[500px] bg-background border-l shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">AI Recruiting Agent</h2>
            <p className="text-xs text-muted-foreground">AI-Powered Job Application Helper</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-xs bg-gray-100 px-2 py-1 rounded">Demo: {demoState ? "ON" : "OFF"}</div>
          {isAuthenticated ? (
            <div className="flex items-center gap-1 mt-1 text-xs">
              <span className="text-green-800 flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="max-w-[100px] truncate">{userEmail}</span>
              </span>
              <button
                onClick={handleLogout}
                className="text-blue-600 hover:text-blue-800 underline ml-1"
              >
                (logout)
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
              disabled={isAuthenticating}
            >
              {isAuthenticating ? "Logging in..." : "Login"}
            </button>
          )}
        </div>
      </div>

      {isInitialLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading job description...</p>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-5 m-4 mb-0 justify-center">
            <TabsTrigger value="job-description" className="flex items-center gap-1">
              JD
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-1" disabled={!review}>
              Review
            </TabsTrigger>
            <TabsTrigger value="resume" className="flex items-center gap-1">
              Resume
            </TabsTrigger>
            <TabsTrigger value="application" className="flex items-center gap-1">
              Application
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-1">
              Contacts
            </TabsTrigger>
          </TabsList>

          {/* All error message shown below tabs menu */}
          {error && (
            <div className="p-3 mx-4 mt-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          <TabsContent value="job-description" className="flex-1 m-0">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="job-description" className="font-medium text-2xl">
                  Job Description
                </Label>
              </div>

              {showJDTooltip && (
                <Tooltip title="Sample Job and Resume" onClose={() => setShowJDTooltip(false)}>
                  Paste your job description into the text area to get started. Generating a review takes up to 2 minutes.
                  <br />
                  <br />
                  Submit the job description below to see a demo review and redlined resume.
                  "
                </Tooltip>
              )}

              {initError && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-orange-800 font-medium">Could not auto-load job description</p>
                      <p className="text-xs text-orange-700 mt-1">{initError}</p>
                      <p className="text-xs text-orange-600 mt-2">Please paste the job description manually below.</p>
                    </div>
                  </div>
                </div>
              )}

              <Textarea
                id="job-description"
                placeholder="Paste job description here..."
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value)
                  if (demoState) {
                    console.log("[v0] User modified job description, setting Demo_State to false")
                    setDemoState(false)
                  }
                }}
                className="min-h-[200px] text-s"
              />

              <div>
                <Label htmlFor="url">Page URL</Label>
                <Input id="url" value={activeTabUrl} readOnly className="mt-2 text-s" />
              </div>

              <div className="mt-4 pt-4 border-t bg-background">
                <Button
                  onClick={handleSendToReview}
                  disabled={!jobDescription.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Submit for Review"
                  )}
                </Button>
              </div>

            </div>
          </TabsContent>

          <TabsContent value="review" className="flex-1 m-0">
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Generating review...</p>
                  </div>
                </div>
              ) : review ? (
                <>
                  <div className="flex items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-lg px-3 py-1 ${getFitScoreStyle(review.Fit?.score ?? null)}`}>
                        {review.Fit?.score !== undefined ? `${review.Fit.score}/10` : "N/A"}
                      </Badge>
                      <span className="font-medium text-2xl">Job Fit</span>
                    </div>
                  </div>

                  <ScrollArea className="h-[calc(100vh-200px)]">
                    <div className="space-y-6 p-4">

                    {showReviewTooltip && (
                      <Tooltip title="Example resume review" onClose={() => setShowReviewTooltip(false)}>
                        I assessed and scored your qualifications against the job's "must-haves". See "Resume" tab for a
                        tailored resume you can use.
                        <br />
                        <br />I have some optional questions to find out if you have other relevant experience not
                        currently listed in your resume. I can use this info to update my review and resume suggestions.
                      </Tooltip>
                    )}

                      <div>
                        <h3 className="text-base font-medium">Rationale</h3>
                        {review.Fit?.rationale ? (
                          <p className="text-s text-muted-foreground">{review.Fit.rationale}</p>
                        ) : (
                          <p className="text-s text-muted-foreground italic">Loading rationale...</p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-medium">Gap Analysis against Job "Must Haves"</h3>
                        <div className="space-y-3">
                          {review.Gap_Map && review.Gap_Map.length > 0 ? (
                            review.Gap_Map.map((gap, index) => (
                              <Card key={index} className="p-3">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <span className="font-medium text-s">{gap["JD Requirement/Keyword"]}</span>
                                    <Badge variant={gap["Present in Resume?"] === "Y" ? "default" : "secondary"}>
                                      {gap["Present in Resume?"]}
                                    </Badge>
                                  </div>
                                  <div className="text-s text-muted-foreground">
                                    <div>
                                      <strong>Evidence:</strong> {gap["Where/Evidence"]}
                                    </div>
                                    <div>
                                      <strong>Suggested Action:</strong> {gap["Gap handling"]}
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No gap analysis available</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-base font-medium">Additional info for AI reviewer</p>
                        <p className="text-s text-muted-foreground mb-3">
                          (Optional) I can provide an even more tailored resume if you can have additional relevant
                          experiences and skills. Feel free to skip (all) questions if not relevant.&nbsp;
                        </p>

                        {authError && (
                          <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{authError}</p>
                          </div>
                        )}

                        <div className="space-y-4">
                          {review.Questions && review.Questions.length > 0 ? (
                            review.Questions.map((question, index) => (
                              <div key={index} className="space-y-2">
                                <p className="text-s font-normal">
                                  {index + 1}. {question}
                                </p>
                                <Textarea
                                  placeholder="Your answer..."
                                  value={questionAnswers[index] || ""}
                                  onChange={(e) =>
                                    setQuestionAnswers((prev) => ({
                                      ...prev,
                                      [index]: e.target.value,
                                    }))
                                  }
                                  className="min-h-[60px] text-s"
                                />
                              </div>
                            ))
                          ) : (
                            <p className="text-s text-muted-foreground">No additional questions</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t bg-background">
                        <Button
                          onClick={handleSubmitQuestions}
                          disabled={isSubmittingQuestions}
                          className="w-full"
                          variant="secondary"
                        >
                          {isSubmittingQuestions ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Submit additional information
                            </>
                          )}
                        </Button>
                      </div>

                    </div>
                  </ScrollArea>


                </>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p className="text-sm">Click "Submit for Review" to generate analysis</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="resume" className="flex-1 m-0">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="redline-toggle" className="text-sm font-medium">
                      Redline
                    </Label>
                    <Switch id="redline-toggle" checked={showRedlines} onCheckedChange={setShowRedlines} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyMarkdown}
                    disabled={!tailoredMarkdown && !initialResume}
                    className={copyFeedback ? "bg-green-50 border-green-300" : ""}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copyFeedback ? "Copied!" : "Copy Clean"}
                  </Button>
                  {/* Download button removed */}
                </div>
              </div>

              <ScrollArea className="h-[calc(100vh-150px)]">
                {isLoadingResume ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading resume...</p>
                    </div>
                  </div>
                ) : tailoredMarkdown || initialResume ? (
                  <div className="bg-white p-6 text-base text-s">
                     {showResumeTooltip && (
                    <Tooltip title="Edit tailored resume" onClose={() => setShowResumeTooltip(false)}>
                      My suggestions are in redline. Hover over{" "}
                      <span className="text-red-600 line-through">red strikethrough</span> or{" "}
                      <span className="text-green-600 font-medium">green text</span> to accept, reject, or edit changes
                      <br />
                    </Tooltip>
                      )}

                <div className="pb-8">
                 <ResumeRenderer
                      markdown={tailoredMarkdown || initialResume}
                      showRedlines={showRedlines}
                      onAcceptChange={handleAcceptChange}
                      onRejectChange={handleRejectChange}
                      onEditChange={handleEditChange}
                    />
                  </div>
                </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p className="text-s">No resume available</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="application" className="flex-1 m-0">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Feature coming soon</span>
              </div>
              <div className="flex items-center justify-center text-muted-foreground h-6">
                <p className="text-sm">
                  To make it easier and quicker to apply to jobs, I'm working on being able fill out the application for you... under your supervision! 
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="flex-1 m-0">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Linkedin className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Feature coming soon</span>
              </div>
              <div className="flex items-center justify-center text-muted-foreground h-6">
                <p className="text-sm">To make it easier to network into this job, I'm working on showing you your 1st and 2nd degree LinkedIn contacts at this company!</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
  
}
