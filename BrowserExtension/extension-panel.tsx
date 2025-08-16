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
import { FileText, CheckCircle, AlertCircle, Linkedin, Loader2, Download, Copy, Send } from "lucide-react"
import { postReviewWithRetry, postQuestions, cleanMarkdown, getCurrentTabUrl, getJobDescription } from "@/lib/api"
import { ResumeRenderer } from "@/components/resume-renderer"
import { Tooltip } from "@/components/tooltip"

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
  const [downloadFeedback, setDownloadFeedback] = useState(false)
  const [showJDTooltip, setShowJDTooltip] = useState(true)
  const [showReviewTooltip, setShowReviewTooltip] = useState(true)
  const [showResumeTooltip, setShowResumeTooltip] = useState(true)
  const [showEditingTooltip, setShowEditingTooltip] = useState(true)
  const [demoState, setDemoState] = useState(true)

  useEffect(() => {
    const initializePanel = async () => {
      try {
        const url = await getCurrentTabUrl()
        setActiveTabUrl(url)

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

  const getFitScoreStyle = (score: number | null) => {
    if (score === null) return "bg-gray-200 text-gray-800"
    if (score >= 9) return "bg-green-800 text-white"
    if (score >= 7) return "bg-green-200 text-green-800"
    if (score >= 5) return "bg-orange-200 text-orange-800"
    if (score >= 3) return "bg-red-200 text-red-800"
    return "bg-red-800 text-white"
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

      const result = await postReviewWithRetry({
        jobDescription: jobDescription.trim(),
        url: activeTabUrl,
        demo: demoState,
      })

      console.log("[v0] Review response received:", result)
      console.log("[v0] Response type:", typeof result)
      console.log("[v0] Response keys:", result ? Object.keys(result) : "null")

      if (result) {
        console.log("[v0] Fit object exists:", !!result.Fit)
        console.log("[v0] Fit.score:", result.Fit?.score)
        console.log("[v0] Fit.rationale length:", result.Fit?.rationale?.length)
        console.log("[v0] Gap_Map exists:", !!result.Gap_Map)
        console.log("[v0] Gap_Map is array:", Array.isArray(result.Gap_Map))
        console.log("[v0] Gap_Map length:", result.Gap_Map?.length)
        console.log("[v0] Questions exists:", !!result.Questions)
        console.log("[v0] Questions is array:", Array.isArray(result.Questions))
        console.log("[v0] Questions length:", result.Questions?.length)
        console.log("[v0] Tailored_Resume exists:", !!result.Tailored_Resume)
        console.log("[v0] Tailored_Resume length:", result.Tailored_Resume?.length)

        console.log("[v0] About to set review state with:", {
          hasFit: !!result.Fit,
          fitScore: result.Fit?.score,
          hasGapMap: !!result.Gap_Map,
          gapMapLength: result.Gap_Map?.length,
          hasQuestions: !!result.Questions,
          questionsLength: result.Questions?.length,
          hasTailoredResume: !!result.Tailored_Resume,
        })
      }

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
    } catch (err) {
      console.log("[v0] Review request failed:", err)
      setError(err instanceof Error ? err.message : "Failed to generate review")
    } finally {
      setIsLoading(false)
      console.log("[v0] Loading state cleared")
    }
  }

  const handleSubmitQuestions = async () => {
    if (!review?.Questions) return

    const questionsAnswers = review.Questions.map((question, index) => ({
      Question: question,
      Answer: questionAnswers[index] || "",
    }))

    setIsSubmittingQuestions(true)

    try {
      await postQuestions({ questionsAnswers })
      setQuestionsSubmitted(true)
    } catch (err) {
      console.log("[v0] Failed to submit questions:", err)
    } finally {
      setIsSubmittingQuestions(false)
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
    if (!tailoredMarkdown) return

    try {
      const contentToCopy = showRedlines ? tailoredMarkdown : cleanMarkdown(tailoredMarkdown)
      await navigator.clipboard.writeText(contentToCopy)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch (err) {
      console.log("[v0] Failed to copy to clipboard:", err)
    }
  }

  const handleDownloadMarkdown = () => {
    if (!tailoredMarkdown) return

    try {
      const content = showRedlines ? tailoredMarkdown : cleanMarkdown(tailoredMarkdown)
      const filename = showRedlines ? "resume_redline.md" : "resume.md"

      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => URL.revokeObjectURL(url), 100)
      setDownloadFeedback(true)
      setTimeout(() => setDownloadFeedback(false), 2000)
    } catch (err) {
      console.error("Failed to download:", err)
    }
  }

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
        <div className="text-xs bg-gray-100 px-2 py-1 rounded">Demo: {demoState ? "ON" : "OFF"}</div>
      </div>

      {isInitialLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading job description...</p>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-5 m-4 mb-0 justify-center">
            <TabsTrigger value="job-description" className="flex items-center gap-1">
              JD
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-1" disabled={!review}>
              Review
            </TabsTrigger>
            <TabsTrigger value="resume" className="flex items-center gap-1" disabled={!tailoredMarkdown}>
              Resume
            </TabsTrigger>
            <TabsTrigger value="application" className="flex items-center gap-1">
              Application
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-1">
              Contacts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="job-description" className="flex-1 m-0">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="job-description" className="font-medium text-2xl">
                  Job Description
                </Label>
                <Button onClick={handleSendToReview} disabled={!jobDescription.trim() || isLoading} size="sm">
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

              {showJDTooltip && (
                <Tooltip title="Sample Job and Resume" onClose={() => setShowJDTooltip(false)}>
                  Click "Submit for Review" or go to "Review" tab to see my analysis of the sample job below for a
                  previously stored resume.
                  <br />
                  <br />
                  Paste your own job description into the text area below. Generating a reviews takes up to 2 minutes."
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

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendToReview}
                    className="mt-2 bg-transparent"
                    disabled={isLoading}
                  >
                    Try Again
                  </Button>
                </div>
              )}
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
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-lg px-3 py-1 ${getFitScoreStyle(review.Fit?.score ?? null)}`}>
                        {review.Fit?.score !== undefined ? `${review.Fit.score}/10` : "N/A"}
                      </Badge>
                      <span className="font-medium text-2xl">Job Fit</span>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab("resume")} disabled={!tailoredMarkdown}>
                      See Resume Suggestions
                    </Button>
                  </div>

                  {showReviewTooltip && (
                    <Tooltip title="Example resume review" onClose={() => setShowReviewTooltip(false)}>
                      I assessed and scored your qualifications against the job's "must-haves". See "Resume" tab for a
                      tailored resume you can use.
                      <br />
                      <br />I have some optional questions to find out if you have other relevant experience not
                      currently listed in your resume. I can use this info to update my review and resume suggestions.
                    </Tooltip>
                  )}

                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                    <div className="space-y-6">
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
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t bg-background">
                    <Button
                      onClick={handleSubmitQuestions}
                      disabled={isSubmittingQuestions || questionsSubmitted}
                      className="w-full"
                      variant="secondary"
                    >
                      {isSubmittingQuestions ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : questionsSubmitted ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Additional Information Submitted
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit additional information
                        </>
                      )}
                    </Button>
                  </div>
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
                    disabled={!tailoredMarkdown}
                    className={copyFeedback ? "bg-green-50 border-green-300" : ""}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copyFeedback ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadMarkdown}
                    disabled={!tailoredMarkdown}
                    className={downloadFeedback ? "bg-green-50 border-green-300" : ""}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    {downloadFeedback ? "Downloaded!" : "Download"}
                  </Button>
                </div>
              </div>

              {showResumeTooltip && (
                <Tooltip title="Edit tailored resume" onClose={() => setShowResumeTooltip(false)}>
                  My suggestions are in redline. Hover over{" "}
                  <span className="text-red-600 line-through">red strikethrough</span> or{" "}
                  <span className="text-green-600 font-medium">green text</span> to accept, reject, or edit changes.
                  Click green text to edit inline.
                  <br />
                  <br />
                  The redline toggle includes or omits redlines for display, copy, and download.
                </Tooltip>
              )}

              <ScrollArea className="h-[calc(100vh-250px)]">
                {tailoredMarkdown ? (
                  <div className="bg-white p-6 text-base text-s">
                    <ResumeRenderer
                      markdown={tailoredMarkdown}
                      showRedlines={showRedlines}
                      onAcceptChange={handleAcceptChange}
                      onRejectChange={handleRejectChange}
                      onEditChange={handleEditChange}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p className="text-s">No resume recommendations available</p>
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
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p className="text-sm">
                  I'm working on being able to automatically complete the job application (with a custom cover letter) for you! 
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
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p className="text-sm">I'm working on being able to tell you who are your 1st and 2nd degree LinkedIn contacts, to help with your networking efforts!</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
  
}
