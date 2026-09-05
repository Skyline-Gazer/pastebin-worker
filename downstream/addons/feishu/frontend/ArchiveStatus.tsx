import { useEffect, useState } from "react"

type RetentionMode = "permanent" | "timed"

const REFRESH_INTERVAL_MS = 60_000
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function remainingLabel(milliseconds: number) {
  const totalMinutes = Math.floor(Math.max(0, milliseconds) / 60_000)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  const parts = [days && `${days}d`, hours && `${hours}h`, `${minutes}m`].filter(Boolean)
  return parts.join(" ")
}

function expiresAtMilliseconds(expiresAt: string | null) {
  if (!expiresAt || !ISO_TIMESTAMP.test(expiresAt)) return null
  const parsed = Date.parse(expiresAt)
  return Number.isFinite(parsed) ? parsed : null
}

export function ArchiveStatus({
  retentionMode,
  expiresAt,
}: {
  retentionMode: RetentionMode
  expiresAt: string | null
}) {
  const [now, setNow] = useState(() => Date.now())
  const deadline = retentionMode === "timed" ? expiresAtMilliseconds(expiresAt) : null

  useEffect(() => {
    if (deadline === null) return
    const timer = globalThis.setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS)
    return () => globalThis.clearInterval(timer)
  }, [deadline])

  if (retentionMode === "permanent") {
    return (
      <p className="archive-label" role="status">
        永久归档
      </p>
    )
  }

  if (deadline === null || deadline <= now) {
    return (
      <p aria-label="限期归档，等待确认过期状态" className="archive-label" role="status">
        限期归档：等待确认过期状态
      </p>
    )
  }

  const remaining = remainingLabel(deadline - now)
  return (
    <p aria-label={`限期归档，剩余 ${remaining}`} className="archive-label" role="status">
      限期归档：剩余 {remaining}
    </p>
  )
}
