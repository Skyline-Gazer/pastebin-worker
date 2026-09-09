const STORAGE_KEY = "pb.localUploads"
const MAX_LOCAL_UPLOADS = 50

export interface LocalUpload {
  url: string
  manageUrl: string
}

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  } catch {
    return false
  }
}

export function pasteLabel(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\//, "")
    return path.split("/")[0] || url
  } catch {
    return url
  }
}

export function loadLocalUploads(): LocalUpload[] {
  if (!canUseLocalStorage()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const entries: LocalUpload[] = []
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue
      const url = (item as { url?: unknown }).url
      const manageUrl = (item as { manageUrl?: unknown }).manageUrl
      if (typeof url !== "string" || typeof manageUrl !== "string") continue
      if (!url || !manageUrl) continue
      entries.push({ url, manageUrl })
    }
    return entries.slice(0, MAX_LOCAL_UPLOADS)
  } catch {
    return []
  }
}

function saveLocalUploads(entries: LocalUpload[]): LocalUpload[] {
  const next = entries.slice(0, MAX_LOCAL_UPLOADS)
  if (!canUseLocalStorage()) return next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    return next
  }
  return next
}

export function recordLocalUpload(entry: LocalUpload): LocalUpload[] {
  const existing = loadLocalUploads().filter((item) => item.manageUrl !== entry.manageUrl)
  return saveLocalUploads([entry, ...existing])
}

export function removeLocalUpload(manageUrl: string): LocalUpload[] {
  return saveLocalUploads(loadLocalUploads().filter((item) => item.manageUrl !== manageUrl))
}
