"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle, X, Edit3 } from "lucide-react"

interface ResumeRendererProps {
  markdown: string
  showRedlines: boolean
  onAcceptChange?: (changeId: string, originalMarkup: string) => void
  onRejectChange?: (changeId: string, originalMarkup: string) => void
  onEditChange?: (changeId: string, originalMarkup: string, newText: string) => void
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

  // Process markdown and extract changes using useMemo to avoid re-processing on every render
  const { processedMarkdown, changeMarkup } = useMemo(() => {
    if (!showRedlines) {
      // Clean version - properly remove all markup tags
      const cleanMarkdown = markdown
        .replace(/<span style="color:#c00000"><del>.*?<\/del><\/span>/g, "")
        .replace(/<span style="color:#008000"><add>(.*?)<\/add><\/span>/g, "$1")
        .replace(/<span style="color:#008000">(.*?)<\/span>/g, "$1")
        .replace(/~~(.*?)~~/g, "")
        .replace(/<add>(.*?)<\/add>/g, "$1") // Remove any remaining <add> tags
        .replace(/<del>.*?<\/del>/g, "") // Remove any remaining <del> tags

      return { processedMarkdown: cleanMarkdown, changeMarkup: new Map<string, string>() }
    }

    // Process the entire markdown as one string to preserve line structure
    let processed = markdown
    let changeId = 0
    const newChangeMarkup = new Map<string, string>()

    // Find deletions with content: <span style="color:#c00000"><del>text</del></span>
    const deletionRegex = /<span style="color:#c00000"><del>(.*?)<\/del><\/span>/g
    processed = processed.replace(deletionRegex, (fullMatch, deletedText) => {
      if (deletedText.trim()) {
        const id = `del-${changeId++}`
        newChangeMarkup.set(id, fullMatch)
        return `<DELETION id="${id}" text="${deletedText.replace(/"/g, "&quot;")}" />`
      }
      return "" // Remove empty deletions
    })

    // Find additions with <add> tags: <span style="color:#008000"><add>text</add></span>
    const additionWithTagRegex = /<span style="color:#008000"><add>(.*?)<\/add><\/span>/g
    processed = processed.replace(additionWithTagRegex, (fullMatch, addedText) => {
      const id = `add-${changeId++}`
      newChangeMarkup.set(id, fullMatch)
      return `<ADDITION id="${id}" text="${addedText.replace(/"/g, "&quot;")}" />`
    })

    // Find regular additions: <span style="color:#008000">text</span> (not preceded by </del></span>)
    const regularAdditionRegex = /(?<!<\/del><\/span>)<span style="color:#008000">(.*?)<\/span>/g
    processed = processed.replace(regularAdditionRegex, (fullMatch, addedText) => {
      const id = `add-${changeId++}`
      newChangeMarkup.set(id, fullMatch)
      return `<ADDITION id="${id}" text="${addedText.replace(/"/g, "&quot;")}" />`
    })

    return { processedMarkdown: processed, changeMarkup: newChangeMarkup }
  }, [markdown, showRedlines])

  const renderFormattedText = (text: string, withRedlines = false) => {
    // Split by lines to handle headers and formatting
    const lines = text.split("\n")

    return lines.map((line, lineIndex) => {
      if (!line.trim()) {
        return <br key={lineIndex} />
      }

      // Check if this is a header line
      if (line.startsWith("## ")) {
        const headerText = line.slice(3)
        return (
          <h2 key={lineIndex} className="text-xl font-bold mt-6 mb-3 text-blue-900">
            {withRedlines ? renderInlineElements(headerText) : headerText}
          </h2>
        )
      }
      if (line.startsWith("# ")) {
        const headerText = line.slice(2)
        return (
          <h1 key={lineIndex} className="text-2xl font-bold text-center mb-4">
            {withRedlines ? renderInlineElements(headerText) : headerText}
          </h1>
        )
      }

      return (
        <div key={lineIndex} className="leading-relaxed">
          {withRedlines ? renderInlineElements(line) : renderPlainText(line)}
        </div>
      )
    })
  }

  const renderPlainText = (text: string) => {
    // Handle bold text
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    return <span dangerouslySetInnerHTML={{ __html: formattedText }} />
  }

  const renderInlineElements = (text: string) => {
    // Parse the text and render inline components
    const segments = text.split(/(<(?:DELETION|ADDITION)[^>]*\/>)/)

    return segments.map((segment, segIndex) => {
      if (segment.startsWith("<DELETION")) {
        const idMatch = segment.match(/id="([^"]*)"/)
        const textMatch = segment.match(/text="([^"]*)"/)
        if (idMatch && textMatch) {
          const id = idMatch[1]
          const text = textMatch[1].replace(/&quot;/g, '"')
          const originalMarkup = changeMarkup.get(id) || ""

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
                    onClick={() => {
                      onAcceptChange?.(id, originalMarkup)
                      setHoveredId(null)
                    }}
                    className="h-6 w-6 p-0"
                    title="Accept deletion (remove text)"
                  >
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onRejectChange?.(id, originalMarkup)
                      setHoveredId(null)
                    }}
                    className="h-6 w-6 p-0"
                    title="Reject deletion (keep text)"
                  >
                    <X className="w-3 h-3 text-red-600" />
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
          const originalMarkup = changeMarkup.get(id) || ""

          if (editingId === id) {
            return (
              <span
                key={segIndex}
                className="relative inline-block bg-blue-50 border border-blue-300 rounded px-1"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newText = e.currentTarget.textContent || ""
                  if (newText !== text) {
                    onEditChange?.(id, originalMarkup, newText)
                  }
                  setEditingId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    const newText = e.currentTarget.textContent || ""
                    onEditChange?.(id, originalMarkup, newText)
                    setEditingId(null)
                  }
                  if (e.key === "Escape") {
                    e.preventDefault()
                    setEditingId(null)
                  }
                }}
                autoFocus
              >
                {text}
              </span>
            )
          }

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
                    onClick={() => {
                      onAcceptChange?.(id, originalMarkup)
                      setHoveredId(null)
                    }}
                    className="h-6 w-6 p-0"
                    title="Accept addition (keep text)"
                  >
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(id)
                      setHoveredId(null)
                    }}
                    className="h-6 w-6 p-0"
                    title="Edit text"
                  >
                    <Edit3 className="w-3 h-3 text-blue-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onRejectChange?.(id, originalMarkup)
                      setHoveredId(null)
                    }}
                    className="h-6 w-6 p-0"
                    title="Reject addition (remove text)"
                  >
                    <X className="w-3 h-3 text-red-600" />
                  </Button>
                </span>
              )}
            </span>
          )
        }
      } else {
        // Regular text - render with markdown-like formatting
        return renderPlainText(segment)
      }
      return null
    })
  }

  return <div className="font-serif leading-relaxed">{renderFormattedText(processedMarkdown, showRedlines)}</div>
}
