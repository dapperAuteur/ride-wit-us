export function formatDate(dateString: string, includeYear = false): string {
  const date = new Date(dateString)

  if (includeYear) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

