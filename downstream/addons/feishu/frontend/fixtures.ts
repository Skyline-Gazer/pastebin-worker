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

export const fixtureEntries: readonly FixtureEntry[] = [
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
