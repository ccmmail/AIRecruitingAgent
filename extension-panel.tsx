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
import {
  FileText,
  Users,
  X,
  CheckCircle,
  AlertCircle,
  Linkedin,
  Loader2,
  Download,
  Copy,
  ClipboardList,
  Send,
} from "lucide-react"
import { postReviewWithRetry, postQuestions, cleanMarkdown, getCurrentTabUrl } from "@/lib/api"
import { DEMO_JOB_DESCRIPTION, DEMO_RESPONSE } from "@/lib/demo-data"
import { ResumeRenderer } from "@/components/resume-renderer"

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
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewData | null>(null)
  const [tailoredMarkdown, setTailoredMarkdown] = useState("")
  const [showRedlines, setShowRedlines] = useState(true)
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({})
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isSubmittingQuestions, setIsSubmittingQuestions] = useState(false)
  const [questionsSubmitted, setQuestionsSubmitted] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [downloadFeedback, setDownloadFeedback] = useState(false)

  useEffect(() => {
    const isExtension = window.__EXTENSION_CONTEXT__?.isExtension || false
    const shouldEnableDemo = window.__ENABLE_DEMO_MODE__ || (!isExtension && isDemoMode)

    getCurrentTabUrl()
      .then(setActiveTabUrl)
      .catch((error) => {
        console.log("[v0] Failed to get current tab URL:", error)
        setActiveTabUrl(window.location.href)
      })

    if (shouldEnableDemo) {
      setJobDescription(DEMO_JOB_DESCRIPTION)
      setReview(DEMO_RESPONSE)
      setTailoredMarkdown(DEMO_RESPONSE.Tailored_Resume)
      setIsDemoMode(true)
    }
  }, [])

  const getFitScoreStyle = (score: number) => {
    if (score >= 9) return "bg-green-800 text-white"
    if (score >= 7) return "bg-green-200 text-green-800"
    if (score >= 5) return "bg-orange-200 text-orange-800"
    if (score >= 3) return "bg-red-200 text-red-800"
    return "bg-red-800 text-white"
  }

  const handleSendToReview = async () => {
    if (!jobDescription.trim()) return

    if (isDemoMode) {
      setActiveTab("review")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await postReviewWithRetry({
        jobDescription: jobDescription.trim(),
        url: activeTabUrl,
      })

      setReview(result)
      setTailoredMarkdown(result.Tailored_Resume || "")
      setActiveTab("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate review")
    } finally {
      setIsLoading(false)
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

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg z-50 flex flex-col">
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
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-5 m-4 mb-0">
          <TabsTrigger value="job-description" className="flex items-center gap-1">
            <ClipboardList className="w-3 h-3" />
            JD
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-1" disabled={!review}>
            <AlertCircle className="w-3 h-3" />
            Review
          </TabsTrigger>
          <TabsTrigger value="resume" className="flex items-center gap-1" disabled={!tailoredMarkdown}>
            <FileText className="w-3 h-3" />
            Resume
          </TabsTrigger>
          <TabsTrigger value="cover-letter" className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Letter
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="job-description" className="flex-1 m-0">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="job-description" className="text-base font-medium">
                Job Description
              </Label>
              <Button onClick={handleSendToReview} disabled={!jobDescription.trim() || isLoading} size="sm">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isDemoMode ? "Loading..." : "Generating..."}
                  </>
                ) : isDemoMode ? (
                  "View Analysis"
                ) : (
                  "Submit for Review"
                )}
              </Button>
            </div>

            {isDemoMode && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="text-xs">
                    Demo
                  </Badge>
                  <span className="text-sm font-medium">Example Job Description</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is a demo with a sample job description and resume. Click "View Analysis" to continue demo or
                  clear the text below to exit demo mode.
                </p>
              </div>
            )}

            <Textarea
              id="job-description"
              placeholder="Paste job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[200px]"
            />

            <div>
              <Label htmlFor="url">Page URL</Label>
              <Input id="url" value={activeTabUrl} readOnly className="mt-2 text-xs" />
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
          {review && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge className={`text-lg px-3 py-1 ${getFitScoreStyle(review.Fit.score)}`}>
                    {review.Fit.score}/10
                  </Badge>
                  <span className="font-medium text-2xl">Fit</span>
                </div>
                <Button size="sm" onClick={() => setActiveTab("resume")} disabled={!tailoredMarkdown}>
                  See Resume Recommendations
                </Button>
              </div>

              {isDemoMode && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="text-xs">
                      Demo
                    </Badge>
                    <span className="text-sm font-medium">Example resume review </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Our AI assesses your qualifications against the job's "must-haves" and scores your fit for the job.
                    It also asks you questions in case you &nbsp;have additional qualifications that are not included in
                    your resume.&nbsp;
                  </p>
                </div>
              )}

              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Rationale</h3>
                    <p className="text-sm text-muted-foreground">{review.Fit.rationale}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Gap Analysis against Job "Must Haves"</h3>
                    <div className="space-y-3">
                      {review.Gap_Map.map((gap, index) => (
                        <Card key={index} className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <span className="font-medium text-sm">{gap["JD Requirement/Keyword"]}</span>
                              <Badge variant={gap["Present in Resume?"] === "Y" ? "default" : "secondary"}>
                                {gap["Present in Resume?"]}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <div>
                                <strong>Evidence:</strong> {gap["Where/Evidence"]}
                              </div>
                              <div>
                                <strong>Suggested Action:</strong> {gap["Gap handling"]}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Additional info for AI reviewer</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      (Optional) I can provide an even more tailored resume if you can have additional relevant
                      experiences and skills. Leave blank if there is no additional information I should take into
                      consideration.&nbsp;
                    </p>
                    <div className="space-y-4">
                      {review.Questions.map((question, index) => (
                        <div key={index} className="space-y-2">
                          <Label className="text-sm font-medium">
                            {index + 1}. {question}
                          </Label>
                          <Textarea
                            placeholder="Your answer..."
                            value={questionAnswers[index] || ""}
                            onChange={(e) =>
                              setQuestionAnswers((prev) => ({
                                ...prev,
                                [index]: e.target.value,
                              }))
                            }
                            className="min-h-[60px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="mt-4 pt-4 border-t">
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
            </div>
          )}
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

            {isDemoMode && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="text-xs">
                    Demo
                  </Badge>
                  <span className="text-sm font-medium">Example tailored resume</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Our AI suggests a tailored resume for the job. Our suggestions are in redline for you to review.
                  Toggle "Redline" off to see your resume without redline. &nbsp;
                </p>
              </div>
            )}

            {showRedlines && (
              <div className="mb-4 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Hover over <span className="text-red-600 line-through">red strikethrough</span> or{" "}
                  <span className="text-green-600 font-medium">green text</span> to accept, reject, or edit changes.
                  Click green text to edit inline.
                </p>
              </div>
            )}

            <ScrollArea className="h-[calc(100vh-250px)]">
              {tailoredMarkdown ? (
                <div className="bg-white p-6 text-black">
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
                  <p className="text-sm">No resume recommendations available</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="cover-letter" className="flex-1 m-0">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Feature coming soon</span>
            </div>
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">Cover letter generation will be available in a future update</p>
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
              <p className="text-sm">LinkedIn contact analysis will be available in a future update</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
