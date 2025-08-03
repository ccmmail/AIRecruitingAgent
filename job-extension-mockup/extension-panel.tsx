"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  FileText,
  Users,
  X,
  CheckCircle,
  AlertCircle,
  Linkedin,
  Building2,
  User,
  MessageCircle,
  ExternalLink,
} from "lucide-react"

export default function Component() {
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("resume")
  const [selectedText, setSelectedText] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  const resumeData = {
    name: "Alex Johnson",
    email: "alex.johnson@email.com",
    phone: "(555) 123-4567",
    location: "San Francisco, CA",
    summary: {
      original: "Experienced software developer with a passion for creating innovative solutions.",
      suggested:
        "Experienced software engineer with 5+ years developing scalable web applications and machine learning solutions, passionate about leveraging AI to solve complex business problems.",
      type: "modify",
      id: "summary-1",
    },
    experience: [
      {
        title: "Software Developer",
        company: "InnovateTech Solutions",
        duration: "2021 - Present",
        responsibilities: [
          {
            original: "Developed web applications using various technologies",
            suggested: "Developed scalable web applications using React, Node.js, and AWS, serving 10K+ daily users",
            type: "modify",
            id: "exp-1",
          },
          "Collaborated with cross-functional teams to deliver high-quality software solutions",
          {
            original: "Responsible for maintaining office supplies and equipment",
            suggested: "",
            type: "remove",
            id: "exp-2",
          },
        ],
      },
      {
        title: "Junior Developer",
        company: "StartupXYZ",
        duration: "2019 - 2021",
        responsibilities: [
          "Built responsive web interfaces using HTML, CSS, and JavaScript",
          "Participated in code reviews and agile development processes",
        ],
      },
    ],
    skills: {
      original: "JavaScript, HTML, CSS, React, Node.js",
      suggested: "JavaScript, HTML, CSS, React, Node.js, Python, Machine Learning, TensorFlow, AWS",
      type: "add",
      id: "skills-1",
    },
    projects: [
      "E-commerce Platform: Built a full-stack online store using MERN stack",
      {
        original: "",
        suggested:
          "AI-Powered Recommendation System: Built using Python and scikit-learn to analyze user behavior patterns and increase user engagement by 25%",
        type: "add",
        id: "project-1",
      },
    ],
    education: {
      degree: "Bachelor of Science in Computer Science",
      school: "University of California, Berkeley",
      year: "2019",
    },
  }

  const coverLetter = `Dear Hiring Manager,

I am writing to express my strong interest in the Software Engineer position at TechCorp. With over 5 years of experience in full-stack development and a growing expertise in machine learning, I am excited about the opportunity to contribute to your innovative team.

In my current role at InnovateTech Solutions, I have successfully developed and deployed scalable web applications that serve over 10,000 daily users. My experience with React, Node.js, and AWS aligns perfectly with TechCorp's technology stack. Additionally, I have been expanding my skills in Python and machine learning, recently building an AI-powered recommendation system that increased user engagement by 25%.

What particularly excites me about TechCorp is your commitment to leveraging artificial intelligence to solve real-world problems. Your recent work on predictive analytics for supply chain optimization resonates with my passion for using technology to create meaningful impact. I am eager to bring my technical skills and collaborative approach to help drive TechCorp's mission forward.

I have attached my resume for your review and would welcome the opportunity to discuss how my background in software development and emerging expertise in AI can contribute to your team's success.

Thank you for your consideration.

Sincerely,
Alex Johnson`

  const writingSuggestions = [
    {
      type: "tone",
      original: "I am writing to express my strong interest",
      suggested: "I am excited to apply for",
      reason: "More enthusiastic and direct opening",
      category: "Opening",
    },
    {
      type: "specificity",
      original: "innovative team",
      suggested: "award-winning engineering team that recently launched the AI-powered supply chain platform",
      reason: "Shows research and specific knowledge about the company",
      category: "Company Knowledge",
    },
    {
      type: "quantification",
      original: "successfully developed and deployed scalable web applications",
      suggested: "successfully developed and deployed 12+ scalable web applications, reducing load times by 40%",
      reason: "Add specific metrics to demonstrate impact",
      category: "Achievements",
    },
    {
      type: "connection",
      original: "What particularly excites me about TechCorp is your commitment",
      suggested:
        "Having followed TechCorp's journey since your Series B funding, I'm particularly drawn to your commitment",
      reason: "Shows long-term interest and awareness of company milestones",
      category: "Company Connection",
    },
    {
      type: "call-to-action",
      original: "I would welcome the opportunity to discuss",
      suggested:
        "I would love to discuss how my experience building recommendation systems aligns with your current ML initiatives",
      reason: "More specific and shows understanding of their needs",
      category: "Closing",
    },
  ]

  const renderTextWithChanges = (item: any, sectionId: string) => {
    if (typeof item === "string") {
      return <span className="text-sm">{item}</span>
    }

    if (item.type === "remove") {
      return (
        <div className="relative group">
          <span className="text-sm line-through text-red-600 bg-red-50 px-1 rounded">{item.original}</span>
          <div className="absolute -right-2 top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-green-600 hover:bg-green-100">
              <CheckCircle className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-blue-600 hover:bg-blue-100">
              <AlertCircle className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-600 hover:bg-red-100">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )
    }

    if (item.type === "modify") {
      return (
        <div className="relative group">
          <span className="text-sm">
            <span className="line-through text-red-600 bg-red-50 px-1 rounded mr-1">{item.original}</span>
            <span className="text-green-600 bg-green-50 px-1 rounded">{item.suggested}</span>
          </span>
          <div className="absolute -right-2 top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-green-600 hover:bg-green-100">
              <CheckCircle className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-blue-600 hover:bg-blue-100">
              <AlertCircle className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-600 hover:bg-red-100">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )
    }

    if (item.type === "add") {
      return (
        <div className="relative group">
          <span className="text-sm text-green-600 bg-green-50 px-1 rounded">{item.suggested}</span>
          <div className="absolute -right-2 top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-green-600 hover:bg-green-100">
              <CheckCircle className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-blue-600 hover:bg-blue-100">
              <AlertCircle className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-600 hover:bg-red-100">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )
    }

    return <span className="text-sm">{item}</span>
  }

  const renderCoverLetterWithSuggestions = () => {
    const content = coverLetter

    return (
      <div className="relative">
        <div className="whitespace-pre-line text-sm leading-relaxed">
          {content.split("\n").map((paragraph, index) => {
            // Check if this paragraph contains any suggestions
            const paragraphSuggestions = writingSuggestions.filter((s) =>
              paragraph.toLowerCase().includes(s.original.toLowerCase()),
            )

            if (paragraphSuggestions.length > 0) {
              let modifiedParagraph = paragraph
              paragraphSuggestions.forEach((suggestion) => {
                const regex = new RegExp(suggestion.original, "gi")
                modifiedParagraph = modifiedParagraph.replace(
                  regex,
                  `<span class="relative group cursor-pointer">
                    <span class="bg-yellow-100 border-b-2 border-yellow-400 hover:bg-yellow-200">${suggestion.original}</span>
                    <div class="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 w-80 p-3 bg-white border rounded-lg shadow-lg">
                      <div class="text-xs font-medium text-gray-700 mb-1">${suggestion.category}</div>
                      <div class="text-xs text-gray-600 mb-2">${suggestion.reason}</div>
                      <div class="text-xs bg-green-50 p-2 rounded border">
                        <strong>Suggested:</strong> ${suggestion.suggested}
                      </div>
                      <div class="flex gap-1 mt-2">
                        <button class="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Apply</button>
                        <button class="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300">Dismiss</button>
                      </div>
                    </div>
                  </span>`,
                )
              })
              return <div key={index} dangerouslySetInnerHTML={{ __html: modifiedParagraph }} />
            }

            return <div key={index}>{paragraph}</div>
          })}
        </div>
      </div>
    )
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
            <p className="text-xs text-muted-foreground">TechCorp - Software Engineer</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
          <TabsTrigger value="resume" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Resume
          </TabsTrigger>
          <TabsTrigger value="cover-letter" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Cover Letter
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Contacts
          </TabsTrigger>
        </TabsList>

        {/* Resume Tab */}
        <TabsContent value="resume" className="flex-1 m-0">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">4 recommendations found</span>
            </div>

            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="bg-white p-6 space-y-6 text-black">
                {/* Header */}
                <div className="text-center border-b pb-4">
                  <h1 className="text-2xl font-bold">{resumeData.name}</h1>
                  <div className="text-sm text-gray-600 mt-2">
                    {resumeData.email} • {resumeData.phone} • {resumeData.location}
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h2 className="text-lg font-semibold mb-2 text-blue-900">PROFESSIONAL SUMMARY</h2>
                  <div className="pl-4">{renderTextWithChanges(resumeData.summary, "summary")}</div>
                </div>

                {/* Experience */}
                <div>
                  <h2 className="text-lg font-semibold mb-2 text-blue-900">EXPERIENCE</h2>
                  <div className="pl-4 space-y-4">
                    {resumeData.experience.map((job, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-sm">{job.title}</h3>
                            <p className="text-sm text-gray-700">{job.company}</p>
                          </div>
                          <span className="text-sm text-gray-600">{job.duration}</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          {job.responsibilities.map((resp, respIndex) => (
                            <li key={respIndex} className="text-sm">
                              {renderTextWithChanges(resp, `exp-${index}-${respIndex}`)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h2 className="text-lg font-semibold mb-2 text-blue-900">TECHNICAL SKILLS</h2>
                  <div className="pl-4">{renderTextWithChanges(resumeData.skills, "skills")}</div>
                </div>

                {/* Projects */}
                <div>
                  <h2 className="text-lg font-semibold mb-2 text-blue-900">KEY PROJECTS</h2>
                  <div className="pl-4 space-y-2">
                    {resumeData.projects.map((project, index) => (
                      <div key={index} className="text-sm">
                        • {renderTextWithChanges(project, `project-${index}`)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education */}
                <div>
                  <h2 className="text-lg font-semibold mb-2 text-blue-900">EDUCATION</h2>
                  <div className="pl-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold text-sm">{resumeData.education.degree}</p>
                        <p className="text-sm text-gray-700">{resumeData.education.school}</p>
                      </div>
                      <span className="text-sm text-gray-600">{resumeData.education.year}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="cover-letter" className="flex-1 m-0">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Auto-generated for TechCorp</span>
            </div>

            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="bg-white p-6 space-y-4 text-black">
                <div className="text-right text-sm text-gray-600 mb-6">
                  {new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>

                {renderCoverLetterWithSuggestions()}
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Writing Assistant</span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded border">
                      <div className="font-medium text-green-700">✓ Strong Points</div>
                      <ul className="mt-1 text-gray-600 space-y-1">
                        <li>• Specific metrics (25% engagement)</li>
                        <li>• Relevant tech stack match</li>
                        <li>• Clear value proposition</li>
                      </ul>
                    </div>

                    <div className="bg-white p-2 rounded border">
                      <div className="font-medium text-orange-700">⚠ Improvements</div>
                      <ul className="mt-1 text-gray-600 space-y-1">
                        <li>• Add more company research</li>
                        <li>• Strengthen opening hook</li>
                        <li>• Include specific examples</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs bg-transparent">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Tone: Professional
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs bg-transparent">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Length: Optimal
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs bg-transparent">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Keywords: 8/10
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Use This Letter
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </div>

              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs bg-transparent">
                  Make More Enthusiastic
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs bg-transparent">
                  Add More Details
                </Button>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="flex-1 m-0">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Linkedin className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">{contacts.length} connections found</span>
            </div>

            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3">
                {contacts.map((contact, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={contact.avatar || "/placeholder.svg"} alt={contact.name} />
                          <AvatarFallback>
                            {contact.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm truncate">{contact.name}</h3>
                            <Badge variant={contact.degree === "1st" ? "default" : "secondary"} className="text-xs">
                              {contact.degree}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground mb-1">{contact.title}</p>

                          <div className="flex items-center gap-1 mb-2">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{contact.department}</span>
                          </div>

                          <div className="flex items-center gap-1 mb-3">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {contact.mutualConnections} mutual connections
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs flex-1">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Message
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        <Button className="w-full" size="sm">
          <CheckCircle className="w-4 h-4 mr-2" />
          Apply All Changes
        </Button>
      </div>
    </div>
  )
}
const contacts = [
  {
    name: "Sarah Chen",
    title: "Senior Software Engineer",
    company: "TechCorp",
    degree: "1st",
    mutualConnections: 12,
    avatar: "/placeholder.svg?height=40&width=40",
    department: "Engineering",
  },
  {
    name: "Michael Rodriguez",
    title: "Engineering Manager",
    company: "TechCorp",
    degree: "2nd",
    mutualConnections: 5,
    avatar: "/placeholder.svg?height=40&width=40",
    department: "Engineering",
  },
  {
    name: "Emily Watson",
    title: "HR Business Partner",
    company: "TechCorp",
    degree: "2nd",
    mutualConnections: 8,
    avatar: "/placeholder.svg?height=40&width=40",
    department: "Human Resources",
  },
  {
    name: "David Kim",
    title: "Principal Engineer",
    company: "TechCorp",
    degree: "1st",
    mutualConnections: 15,
    avatar: "/placeholder.svg?height=40&width=40",
    department: "Engineering",
  },
]
