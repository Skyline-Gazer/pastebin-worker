export function displayUrl(publicUrl: string): string {
  const parsed = new URL(publicUrl)
  parsed.pathname = `/d${parsed.pathname}`
  parsed.hash = ""
  parsed.search = ""
  return parsed.toString()
}

export function downloadUrl(publicUrl: string): string {
  const parsed = new URL(publicUrl)
  parsed.hash = ""
  parsed.search = "a"
  return parsed.toString()
}
