export interface InlineChange {
  id: string
  type: "deletion" | "addition" | "replacement"
  originalText?: string
  newText?: string
  status: "pending" | "accepted" | "rejected" | "edited"
  editedText?: string
  startIndex: number
  endIndex: number
}

export function parseInlineChanges(markdown: string): { processedMarkdown: string; changes: InlineChange[] } {
  const changes: InlineChange[] = []
  let processedMarkdown = markdown
  let changeId = 0

  // Find replacement patterns: <del>old</del><span>new</span>
  const replacementRegex =
    /<span style="color:#c00000"><del>(.*?)<\/del><\/span><span style="color:#008000">(.*?)<\/span>/g
  let match

  while ((match = replacementRegex.exec(markdown)) !== null) {
    const [fullMatch, originalText, newText] = match
    const changeIdStr = `change-${changeId++}`

    changes.push({
      id: changeIdStr,
      type: "replacement",
      originalText: originalText.trim(),
      newText: newText.trim(),
      status: "pending",
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
    })

    // Replace with inline component placeholder
    processedMarkdown = processedMarkdown.replace(
      fullMatch,
      `<span data-change-id="${changeIdStr}" class="inline-change replacement">${originalText}</span>`,
    )
  }

  // Find standalone deletions
  const deletionRegex = /<span style="color:#c00000"><del>(.*?)<\/del><\/span>(?!<span style="color:#008000">)/g
  while ((match = deletionRegex.exec(processedMarkdown)) !== null) {
    const [fullMatch, originalText] = match
    const changeIdStr = `change-${changeId++}`

    changes.push({
      id: changeIdStr,
      type: "deletion",
      originalText: originalText.trim(),
      status: "pending",
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
    })

    processedMarkdown = processedMarkdown.replace(
      fullMatch,
      `<span data-change-id="${changeIdStr}" class="inline-change deletion">${originalText}</span>`,
    )
  }

  // Find standalone additions
  const additionRegex = /(?<!<\/del><\/span>)<span style="color:#008000">(.*?)<\/span>/g
  while ((match = additionRegex.exec(processedMarkdown)) !== null) {
    const [fullMatch, newText] = match
    const changeIdStr = `change-${changeId++}`

    changes.push({
      id: changeIdStr,
      type: "addition",
      newText: newText.trim(),
      status: "pending",
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
    })

    processedMarkdown = processedMarkdown.replace(
      fullMatch,
      `<span data-change-id="${changeIdStr}" class="inline-change addition">${newText}</span>`,
    )
  }

  return { processedMarkdown, changes }
}

export function applyInlineChanges(markdown: string, changes: InlineChange[]): string {
  let result = markdown

  // Sort changes by start index in reverse order to avoid index shifting
  const sortedChanges = [...changes].sort((a, b) => b.startIndex - a.startIndex)

  sortedChanges.forEach((change) => {
    const placeholder = `<span data-change-id="${change.id}" class="inline-change ${change.type}"`

    if (change.status === "accepted") {
      if (change.type === "replacement" && change.newText) {
        result = result.replace(new RegExp(`${placeholder}[^>]*>[^<]*</span>`), change.newText)
      } else if (change.type === "addition" && change.newText) {
        result = result.replace(new RegExp(`${placeholder}[^>]*>[^<]*</span>`), change.newText)
      } else if (change.type === "deletion") {
        result = result.replace(new RegExp(`${placeholder}[^>]*>[^<]*</span>`), "")
      }
    } else if (change.status === "rejected") {
      if (change.type === "replacement" && change.originalText) {
        result = result.replace(new RegExp(`${placeholder}[^>]*>[^<]*</span>`), change.originalText)
      } else if (change.type === "addition") {
        result = result.replace(new RegExp(`${placeholder}[^>]*>[^<]*</span>`), "")
      } else if (change.type === "deletion" && change.originalText) {
        result = result.replace(new RegExp(`${placeholder}[^>]*>[^<]*</span>`), change.originalText)
      }
    } else if (change.status === "edited" && change.editedText) {
      result = result.replace(new RegExp(`${placeholder}[^>]*>[^<]*</span>`), change.editedText)
    }
  })

  return result
}
