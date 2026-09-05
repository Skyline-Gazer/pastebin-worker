export type FixtureVisibility = "active" | "archived"
export type FixtureRetention = "permanent" | "timed"

export interface FixtureEntry {
  id: string
  pasteName: string
  publicUrl: string
  content: string
  visibility: FixtureVisibility
  retentionMode: FixtureRetention
  expiresAt: string | null
  managedTask: { state: "unchecked" | "checked" }
}

function isValidIsoTimestamp(value: string | null): value is string {
  return (
    value !== null && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value))
  )
}

export function validateFixtureEntries(entries: readonly FixtureEntry[]) {
  for (const entry of entries) {
    if (entry.visibility === "active" && (entry.retentionMode !== "permanent" || entry.expiresAt !== null)) {
      throw new Error("Active fixtures must be permanent with no expiresAt")
    }

    if (entry.visibility === "archived" && entry.retentionMode === "permanent" && entry.expiresAt !== null) {
      throw new Error("Permanent archive fixtures must not have expiresAt")
    }

    if (entry.visibility === "archived" && entry.retentionMode === "timed" && !isValidIsoTimestamp(entry.expiresAt)) {
      throw new Error("Timed archive fixtures require a valid ISO expiresAt")
    }
  }
}

const entries: readonly FixtureEntry[] = [
  {
    id: "active-fixture",
    pasteName: "Active fixture",
    publicUrl: "https://example.invalid/p/active-fixture",
    content: `- [ ] first Markdown task
- [x] lowercase checked task
  - [X] nested uppercase checked task

\`\`\`markdown
- [ ] fenced source task
\`\`\`

<script>Unsafe fixture markup</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">unsafe link</a>`,
    visibility: "active",
    retentionMode: "permanent",
    expiresAt: null,
    managedTask: { state: "unchecked" },
  },
  {
    id: "permanent-archive-fixture",
    pasteName: "Permanent archive fixture",
    publicUrl: "https://example.invalid/p/permanent-archive-fixture",
    content: "Archived fixture content.",
    visibility: "archived",
    retentionMode: "permanent",
    expiresAt: null,
    managedTask: { state: "checked" },
  },
  {
    id: "timed-archive-fixture",
    pasteName: "Timed archive fixture",
    publicUrl: "https://example.invalid/p/timed-archive-fixture",
    content: "Timed archived fixture content.",
    visibility: "archived",
    retentionMode: "timed",
    expiresAt: "2030-01-02T03:04:05.000Z",
    managedTask: { state: "checked" },
  },
]

validateFixtureEntries(entries)

export const fixtureEntries = entries
