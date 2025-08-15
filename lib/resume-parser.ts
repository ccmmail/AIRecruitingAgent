export interface ResumeChange {
  id: string
  type: "deletion" | "addition" | "replacement"
  originalText?: string
  newText?: string
  fullText: string
  status: "pending" | "accepted" | "rejected"
  context: string
}

export function parseResumeChanges(markdown: string): ResumeChange[] {
  const changes: ResumeChange[] = []
  let changeId = 0

  // Find replacement patterns: <del>old</del><span>new</span>
  const replacementRegex =
    /<span style="color:#c00000"><del>(.*?)<\/del><\/span><span style="color:#008000">(.*?)<\/span>/g
  let match

  while ((match = replacementRegex.exec(markdown)) !== null) {
    const [fullMatch, originalText, newText] = match
    const contextStart = Math.max(0, match.index - 50)
    const contextEnd = Math.min(markdown.length, match.index + fullMatch.length + 50)
    const context = markdown.slice(contextStart, contextEnd)

    changes.push({
      id: `change-${changeId++}`,
      type: "replacement",
      originalText: originalText.trim(),
      newText: newText.trim(),
      fullText: fullMatch,
      status: "pending",
      context: context.replace(/<[^>]*>/g, "").trim(),
    })
  }

  // Find standalone deletions
  const deletionRegex = /<span style="color:#c00000"><del>(.*?)<\/del><\/span>(?!<span style="color:#008000">)/g
  while ((match = deletionRegex.exec(markdown)) !== null) {
    const [fullMatch, originalText] = match
    const contextStart = Math.max(0, match.index - 50)
    const contextEnd = Math.min(markdown.length, match.index + fullMatch.length + 50)
    const context = markdown.slice(contextStart, contextEnd)

    changes.push({
      id: `change-${changeId++}`,
      type: "deletion",
      originalText: originalText.trim(),
      fullText: fullMatch,
      status: "pending",
      context: context.replace(/<[^>]*>/g, "").trim(),
    })
  }

  // Find standalone additions
  const additionRegex = /(?<!<\/del><\/span>)<span style="color:#008000">(.*?)<\/span>/g
  while ((match = additionRegex.exec(markdown)) !== null) {
    const [fullMatch, newText] = match
    const contextStart = Math.max(0, match.index - 50)
    const contextEnd = Math.min(markdown.length, match.index + fullMatch.length + 50)
    const context = markdown.slice(contextStart, contextEnd)

    changes.push({
      id: `change-${changeId++}`,
      type: "addition",
      newText: newText.trim(),
      fullText: fullMatch,
      status: "pending",
      context: context.replace(/<[^>]*>/g, "").trim(),
    })
  }

  return changes
}

export function applyChanges(markdown: string, changes: ResumeChange[]): string {
  let result = markdown

  changes.forEach((change) => {
    if (change.status === "accepted") {
      if (change.type === "replacement" && change.newText) {
        result = result.replace(change.fullText, change.newText)
      } else if (change.type === "addition" && change.newText) {
        result = result.replace(change.fullText, change.newText)
      } else if (change.type === "deletion") {
        result = result.replace(change.fullText, "")
      }
    } else if (change.status === "rejected") {
      if (change.type === "replacement" && change.originalText) {
        result = result.replace(change.fullText, change.originalText)
      } else if (change.type === "addition") {
        result = result.replace(change.fullText, "")
      } else if (change.type === "deletion" && change.originalText) {
        result = result.replace(change.fullText, change.originalText)
      }
    }
  })

  return result
}
