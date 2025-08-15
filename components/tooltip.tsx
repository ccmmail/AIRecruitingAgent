"use client"

import type React from "react"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface TooltipProps {
  title: string
  children: React.ReactNode
  onClose?: () => void
}

export function Tooltip({ title, children, onClose }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) return null

  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs">
            Tip
          </Badge>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClose} className="h-auto p-1">
          <X className="w-3 h-3" />
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">{children}</div>
    </div>
  )
}
