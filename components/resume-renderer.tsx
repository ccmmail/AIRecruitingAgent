"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle, X, Edit3 } from "lucide-react"
import { Input } from "@/components/ui/input"

interface ResumeRendererProps {
  markdown: string
  showRedlines: boolean
  onAcceptChange?: (changeId: string) => void
  onRejectChange?: (changeId: string) => void
  onEditChange?: (changeId: string, newText: string) => void
}

export function ResumeRenderer({
  markdown,
  showRedlines,
  onAcceptChange,
  onRejectChange,
  onEditChange,
}: ResumeRendererProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Parse and render the markdown with inline controls
  const renderContent = () => {
    if (!showRedlines) {
      // Clean version - remove all redline markup
      return markdown
        .replace(/<span style="color:#c00000"><del>.*?<\/del><\/span>/g, "")
        .replace(/<span style="color:#008000">(.*?)<\/span>/g, "$1")
        .replace(/~~.*?~~/g, "")
    }

    // Split content by lines to preserve formatting
    const lines = markdown.split("\n")

    return lines.map((line, lineIndex) => {
      if (!line.trim()) {
        return <br key={lineIndex} />
      }

      // Process deletions and additions in the line
      const parts = []
      const currentIndex = 0
      let changeId = 0

      // Find deletions: <span style="color:#c00000"><del>text</del></span>
      const deletionRegex = /<span style="color:#c00000"><del>(.*?)<\/del><\/span>/g
      let match

      const processedLine = line.replace(deletionRegex, (fullMatch, deletedText) => {
        const id = `del-${lineIndex}-${changeId++}`
        return `<DELETION id="${id}" text="${deletedText.replace(/"/g, "&quot;")}" />`
      })

      // Find additions: <span style="color:#008000">text</span>
      const additionRegex = /<span style="color:#008000">(.*?)<\/span>/g
      const finalLine = processedLine.replace(additionRegex, (fullMatch, addedText) => {
        const id = `add-${lineIndex}-${changeId++}`
        return `<ADDITION id="${id}" text="${addedText.replace(/"/g, "&quot;")}" />`
      })

      // Parse the processed line and render components
      const segments = finalLine.split(/(<(?:DELETION|ADDITION)[^>]*\/>)/)

      return (
        <div key={lineIndex} className="leading-relaxed">
          {segments.map((segment, segIndex) => {
            if (segment.startsWith("<DELETION")) {
              const idMatch = segment.match(/id="([^"]*)"/)
              const textMatch = segment.match(/text="([^"]*)"/)
              if (idMatch && textMatch) {
                const id = idMatch[1]
                const text = textMatch[1].replace(/&quot;/g, '"')
                return (
                  <span
                    key={segIndex}
                    className="relative inline-block"
                    onMouseEnter={() => setHoveredId(id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <span className="text-red-600 line-through">{text}</span>
                    {hoveredId === id && (
                      <span className="absolute -top-8 left-0 flex gap-1 bg-white border rounded shadow-lg p-1 z-10">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRejectChange?.(id)}
                          className="h-6 w-6 p-0"
                          title="Remove this deletion"
                        >
                          <X className="w-3 h-3 text-red-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(id)
                            setEditText(text)
                          }}
                          className="h-6 w-6 p-0"
                          title="Edit this text"
                        >
                          <Edit3 className="w-3 h-3 text-blue-600" />
                        </Button>
                      </span>
                    )}
                  </span>
                )
              }
            } else if (segment.startsWith("<ADDITION")) {
              const idMatch = segment.match(/id="([^"]*)"/)
              const textMatch = segment.match(/text="([^"]*)"/)
              if (idMatch && textMatch) {
                const id = idMatch[1]
                const text = textMatch[1].replace(/&quot;/g, '"')
                return (
                  <span
                    key={segIndex}
                    className="relative inline-block"
                    onMouseEnter={() => setHoveredId(id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <span className="text-green-600 font-medium">{text}</span>
                    {hoveredId === id && (
                      <span className="absolute -top-8 left-0 flex gap-1 bg-white border rounded shadow-lg p-1 z-10">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAcceptChange?.(id)}
                          className="h-6 w-6 p-0"
                          title="Accept this addition"
                        >
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRejectChange?.(id)}
                          className="h-6 w-6 p-0"
                          title="Reject this addition"
                        >
                          <X className="w-3 h-3 text-red-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(id)
                            setEditText(text)
                          }}
                          className="h-6 w-6 p-0"
                          title="Edit this text"
                        >
                          <Edit3 className="w-3 h-3 text-blue-600" />
                        </Button>
                      </span>
                    )}
                  </span>
                )
              }
            } else {
              // Regular text - render with markdown-like formatting
              let formattedText = segment

              // Handle headers
              if (formattedText.startsWith("## ")) {
                return (
                  <h2 key={segIndex} className="text-xl font-bold mt-6 mb-3 text-blue-900">
                    {formattedText.slice(3)}
                  </h2>
                )
              }
              if (formattedText.startsWith("# ")) {
                return (
                  <h1 key={segIndex} className="text-2xl font-bold text-center mb-4">
                    {formattedText.slice(2)}
                  </h1>
                )
              }

              // Handle bold text
              formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

              return <span key={segIndex} dangerouslySetInnerHTML={{ __html: formattedText }} />
            }
            return null
          })}
        </div>
      )
    })
  }

  // Handle editing
  if (editingId) {
    return (
      <div className="p-4 bg-blue-50 border rounded">
        <div className="mb-2">
          <label className="text-sm font-medium">Edit text:</label>
        </div>
        <Input value={editText} onChange={(e) => setEditText(e.target.value)} className="mb-2" autoFocus />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              onEditChange?.(editingId, editText)
              setEditingId(null)
            }}
          >
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return <div className="font-serif leading-relaxed">{renderContent()}</div>
}
