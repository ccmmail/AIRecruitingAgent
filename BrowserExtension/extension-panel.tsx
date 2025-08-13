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
  Eye,
  EyeOff,
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
  const [isDemoMode, setIsDemoMode] = useState(true)
  const [isSubmittingQuestions, setIsSubmittingQuestions] = useState(false)
  const [questionsSubmitted, setQuestionsSubmitted] = useState(false)
  const [acceptedChanges, setAcceptedChanges] = useState<Set<string>>(new Set())
  const [rejectedChanges, setRejectedChanges] = useState<Set<string>>(new Set())
  const [editedChanges, setEditedChanges] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    getCurrentTabUrl()
      .then(setActiveTabUrl)
      .catch(() => {
        setActiveTabUrl(window.location.href)
      })

    // Initialize demo mode
    if (isDemoMode) {
      setJobDescription(DEMO_JOB_DESCRIPTION)
      setReview(DEMO_RESPONSE)
      setTailoredMarkdown(DEMO_RESPONSE.Tailored_Resume)
    }
  }, [isDemoMode])

  const handleSendToReview = async () => {
    if (!jobDescription.trim()) return

    if (isDemoMode) {
      setIsDemoMode(false)
      setIsLoading(true)
      // Simulate loading for demo
      setTimeout(() => {
        setIsLoading(false)
        setActiveTab("review")
      }, 2000)
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
      console.error("Failed to submit questions:", err)
    } finally {
      setIsSubmittingQuestions(false)
    }
  }

  const handleAcceptChange = (changeId: string) => {
    setAcceptedChanges((prev) => new Set([...prev, changeId]))
    setRejectedChanges((prev) => {
      const newSet = new Set(prev)
      newSet.delete(changeId)
      return newSet
    })
  }

  const handleRejectChange = (changeId: string) => {
    setRejectedChanges((prev) => new Set([...prev, changeId]))
    setAcceptedChanges((prev) => {
      const newSet = new Set(prev)
      newSet.delete(changeId)
      return newSet
    })
  }

  const handleEditChange = (changeId: string, newText: string) => {
    setEditedChanges((prev) => new Map([...prev, [changeId, newText]]))
    setAcceptedChanges((prev) => new Set([...prev, changeId]))
  }

  const handleCopyCleanMarkdown = async () => {
    if (!tailoredMarkdown) return

    try {
      await navigator.clipboard.writeText(cleanMarkdown(tailoredMarkdown))
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleDownloadCleanMarkdown = () => {
    if (!tailoredMarkdown) return

    const cleanContent = cleanMarkdown(tailoredMarkdown)
    const blob = new Blob([cleanContent], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "tailored_resume.md"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">JobBoost Assistant</h2>
            <p className="text-xs text-muted-foreground">AI-Powered Job Application Helper</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
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

        {/* Job Description Tab */}
        <TabsContent value="job-description" className="flex-1 m-0">
          <div className="p-4 space-y-4">
            <div>
              <Label htmlFor="job-description">Job Description</Label>
              <Textarea
                id="job-description"
                placeholder="Paste job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[200px] mt-2"
              />
            </div>

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

            {isDemoMode && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="text-xs">
                    Demo Mode
                  </Badge>
                  <span className="text-sm font-medium">Example Job Description for CEO</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is a demo with sample data. Click "View Demo Analysis" to see the analysis, or clear the text to
                  exit demo mode.
                </p>
              </div>
            )}

            <Button onClick={handleSendToReview} disabled={!jobDescription.trim() || isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isDemoMode ? "Loading demo..." : "Generating review... this can take up to ~120 seconds"}
                </>
              ) : isDemoMode ? (
                "View Demo Analysis"
              ) : (
                "Send to Review"
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="flex-1 m-0">
          {review && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-lg px-3 py-1">
                    {review.Fit.score}/10
                  </Badge>
                  <span className="text-sm font-medium">Fit Score</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("resume")} disabled={!tailoredMarkdown}>
                  See Resume Recommendations
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-6">
                  {/* Rationale */}
                  <div>
                    <h3 className="font-semibold mb-2">Rationale</h3>
                    <p className="text-sm text-muted-foreground">{review.Fit.rationale}</p>
                  </div>

                  {/* Gap Map */}
                  <div>
                    <h3 className="font-semibold mb-3">Gap Analysis</h3>
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

                  {/* Questions */}
                  <div>
                    <h3 className="font-semibold mb-3">Interview Preparation Questions</h3>
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

              {/* Submit Questions Button */}
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={handleSubmitQuestions}
                  disabled={isSubmittingQuestions || questionsSubmitted}
                  className="w-full"
                  variant={questionsSubmitted ? "outline" : "default"}
                >
                  {isSubmittingQuestions ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : questionsSubmitted ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Questions Submitted
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Questions & Answers
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Resume Tab */}
        <TabsContent value="resume" className="flex-1 m-0">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowRedlines(!showRedlines)}>
                  {showRedlines ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                  {showRedlines ? "Clean" : "Redline"}
                </Button>
                {isDemoMode && (
                  <Badge variant="secondary" className="text-xs">
                    Demo Mode
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyCleanMarkdown} disabled={!tailoredMarkdown}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Clean
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadCleanMarkdown} disabled={!tailoredMarkdown}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>

            {showRedlines && (
              <div className="mb-4 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Hover over <span className="text-red-600 line-through">red strikethrough</span> or{" "}
                  <span className="text-green-600 font-medium">green text</span> to accept, reject, or edit changes.
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

        {/* Cover Letter Tab */}
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

        {/* Contacts Tab */}
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
