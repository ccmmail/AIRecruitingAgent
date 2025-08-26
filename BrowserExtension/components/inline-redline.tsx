"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, X, Edit3 } from "lucide-react"
import type { InlineChange } from "@/lib/inline-redline-parser"

interface InlineRedlineProps {
  change: InlineChange
  onAccept: (changeId: string) => void
  onReject: (changeId: string) => void
  onEdit: (changeId: string, newText: string) => void
}

export function InlineRedline({ change, onAccept, onReject, onEdit }: InlineRedlineProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(change.originalText || change.newText || "")
  const [showControls, setShowControls] = useState(false)

  const handleEdit = () => {
    onEdit(change.id, editText)
    setIsEditing(false)
    setShowControls(false)
  }

  const getDisplayText = () => {
    if (change.status === "accepted") {
      return change.type === "replacement" ? change.newText : change.type === "addition" ? change.newText : ""
    } else if (change.status === "rejected") {
      return change.type === "addition" ? "" : change.originalText
    } else if (change.status === "edited") {
      return change.editedText
    }
    return change.originalText || change.newText || ""
  }

  const getBackgroundColor = () => {
    if (change.status === "accepted") return "bg-green-100 border-green-300"
    if (change.status === "rejected") return "bg-red-100 border-red-300"
    if (change.status === "edited") return "bg-blue-100 border-blue-300"
    if (change.type === "replacement") return "bg-yellow-100 border-yellow-300"
    if (change.type === "addition") return "bg-green-50 border-green-200"
    if (change.type === "deletion") return "bg-red-50 border-red-200"
    return "bg-gray-100 border-gray-300"
  }

  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1 px-1 py-0.5 border rounded bg-blue-50 border-blue-300">
        <Input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="h-6 text-xs min-w-[100px] max-w-[200px]"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleEdit()
            if (e.key === "Escape") {
              setIsEditing(false)
              setShowControls(false)
            }
          }}
        />
        <Button size="sm" variant="outline" onClick={handleEdit} className="h-6 w-6 p-0 bg-transparent">
          <CheckCircle className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setIsEditing(false)
            setShowControls(false)
          }}
          className="h-6 w-6 p-0"
        >
          <X className="w-3 h-3" />
        </Button>
      </span>
    )
  }

  return (
    <span
      className={`relative inline-block px-1 py-0.5 border rounded cursor-pointer ${getBackgroundColor()}`}
      onMouseEnter={() => change.status === "pending" && setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {getDisplayText()}
      {showControls && change.status === "pending" && (
        <span className="absolute -top-8 left-0 flex gap-1 bg-white border rounded shadow-lg p-1 z-10">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onAccept(change.id)
              setShowControls(false)
            }}
            className="h-6 w-6 p-0 bg-transparent"
            title="Accept change"
          >
            <CheckCircle className="w-3 h-3 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onReject(change.id)
              setShowControls(false)
            }}
            className="h-6 w-6 p-0 bg-transparent"
            title="Reject change"
          >
            <X className="w-3 h-3 text-red-600" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsEditing(true)
              setShowControls(false)
            }}
            className="h-6 w-6 p-0 bg-transparent"
            title="Edit text"
          >
            <Edit3 className="w-3 h-3 text-blue-600" />
          </Button>
        </span>
      )}
    </span>
  )
}
