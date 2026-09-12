export class PasteError extends Error {
  constructor(readonly code: "UPSTREAM_REJECTED" | "UPSTREAM_UNCERTAIN" | "ENTRY_NOT_FOUND" | "UPSTREAM_INVALID") {
    super(code)
  }
}

type PasteCreateStage = "formdata_ready" | "transport_enter" | "transport_response" | "response_parse" | "done"
const SAFE_PASTE_CODE = /^(UPSTREAM_REJECTED|UPSTREAM_UNCERTAIN|ENTRY_NOT_FOUND|UPSTREAM_INVALID)$/
const SAFE_EXCEPTION_CLASS = /^[A-Za-z][A-Za-z0-9_]*$/
const SAFE_CORRELATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function exceptionClass(error: unknown): string | undefined {
  const name = error instanceof Error ? error.constructor.name : undefined
  return name && SAFE_EXCEPTION_CLASS.test(name) ? name : undefined
}

function reportPasteCreateStage(
  stage: PasteCreateStage,
  failure?: { code?: string; error?: unknown; correlationId?: string },
): void {
  if (!failure) {
    console.log(`PASTE_CREATE_STAGE=${stage}`)
    return
  }
  const parts = [`PASTE_CREATE_STAGE=${stage}`]
  if (failure.code && SAFE_PASTE_CODE.test(failure.code)) parts.push(`code=${failure.code}`)
  const errorClass = exceptionClass(failure.error)
  if (errorClass) parts.push(`class=${errorClass}`)
  if (failure.correlationId && SAFE_CORRELATION_ID.test(failure.correlationId))
    parts.push(`correlationId=${failure.correlationId}`)
  console.log(parts.join(" "))
}

export class PasteClient {
  readonly origin: string

  constructor(
    origin: string,
    private readonly transport: typeof fetch = fetch,
    private readonly authorization?: string,
  ) {
    const url = new URL(origin)
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
      throw new Error("INVALID_UPSTREAM_ORIGIN")
    this.origin = url.origin
  }

  publicUrl(name: string): string {
    // Only server-generated names are accepted; never accept arbitrary URLs or management paths.
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new PasteError("UPSTREAM_INVALID")
    return `${this.origin}/${name}`
  }

  private async request(
    url: string,
    init: RequestInit,
    createDiagnostics?: { correlationId?: string },
  ): Promise<Response> {
    let response: Response
    try {
      if (createDiagnostics) reportPasteCreateStage("transport_enter")
      const transport = this.transport
      response = await transport(url, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: this.authorization ? { Authorization: this.authorization } : undefined,
      })
      if (createDiagnostics) reportPasteCreateStage("transport_response")
    } catch (error) {
      if (createDiagnostics)
        reportPasteCreateStage("transport_enter", {
          code: "UPSTREAM_UNCERTAIN",
          error,
          correlationId: createDiagnostics.correlationId,
        })
      throw new PasteError("UPSTREAM_UNCERTAIN")
    }
    if (response.status === 404) {
      const error = new PasteError("ENTRY_NOT_FOUND")
      if (createDiagnostics)
        reportPasteCreateStage("transport_response", {
          code: error.code,
          error,
          correlationId: createDiagnostics.correlationId,
        })
      throw error
    }
    if (!response.ok) {
      const error = new PasteError(
        response.status >= 400 && response.status < 500 ? "UPSTREAM_REJECTED" : "UPSTREAM_UNCERTAIN",
      )
      if (createDiagnostics)
        reportPasteCreateStage("transport_response", {
          code: error.code,
          error,
          correlationId: createDiagnostics.correlationId,
        })
      throw error
    }
    return response
  }

  private async write(
    path: string,
    method: string,
    content: string,
    password?: string,
    expiration = "never",
    createDiagnostics?: { correlationId?: string },
  ): Promise<{ name: string; expiresAt: string | null }> {
    const body = new FormData()
    body.set("c", content)
    body.set("e", expiration)
    if (password) body.set("s", password)
    if (method === "POST") body.set("p", "1")
    if (createDiagnostics) reportPasteCreateStage("formdata_ready")
    const response = await this.request(`${this.origin}${path}`, { method, body }, createDiagnostics)
    if (createDiagnostics) reportPasteCreateStage("response_parse")
    try {
      const data = await response.json<Record<string, unknown>>()
      if (typeof data.url !== "string") throw new Error()
      const expiresAt = data.expireAt
      if (expiration === "never" && (expiresAt !== null || data.expirationSeconds !== null)) throw new Error()
      if (expiration === "max" && (typeof expiresAt !== "string" || !Number.isFinite(Date.parse(expiresAt))))
        throw new Error()
      const url = new URL(data.url)
      const name = url.pathname.slice(1)
      if (data.url !== this.publicUrl(name)) throw new Error()
      if (createDiagnostics) reportPasteCreateStage("done")
      return { name, expiresAt: expiresAt as string | null }
    } catch (error) {
      if (createDiagnostics)
        reportPasteCreateStage("response_parse", {
          code: "UPSTREAM_INVALID",
          error,
          correlationId: createDiagnostics.correlationId,
        })
      throw new PasteError("UPSTREAM_INVALID")
    }
  }

  create(content: string, password: string, correlationId?: string): Promise<string> {
    return this.write("/", "POST", content, password, "never", { correlationId }).then((value) => value.name)
  }

  async update(
    name: string,
    password: string,
    content: string,
    expiration: "never" | "max" = "never",
  ): Promise<string | null> {
    this.publicUrl(name)
    if (!/^[a-f0-9]{64}$/.test(password)) throw new PasteError("UPSTREAM_INVALID")
    const returned = await this.write(`/${name}:${password}`, "PUT", content, undefined, expiration)
    if (returned.name !== name) throw new PasteError("UPSTREAM_INVALID")
    return returned.expiresAt
  }

  async remove(name: string, password: string): Promise<void> {
    this.publicUrl(name)
    if (!/^[a-f0-9]{64}$/.test(password)) throw new PasteError("UPSTREAM_INVALID")
    await this.request(`${this.origin}/${name}:${password}`, { method: "DELETE" })
  }

  /** Verify metadata against the binding's authoritative retention state. */
  async permanent(name: string, expectedExpiresAt: string | null = null): Promise<void> {
    this.publicUrl(name)
    const response = await this.request(`${this.origin}/m/${name}`, { method: "GET" })
    try {
      const metadata = await response.json<Record<string, unknown>>()
      if (
        metadata.expireAt !== expectedExpiresAt ||
        (expectedExpiresAt !== null && !Number.isFinite(Date.parse(expectedExpiresAt)))
      )
        throw new Error()
    } catch {
      throw new PasteError("UPSTREAM_INVALID")
    }
  }

  async read(name: string): Promise<string> {
    const response = await this.request(this.publicUrl(name), { method: "GET" })
    try {
      return await response.text()
    } catch {
      throw new PasteError("UPSTREAM_UNCERTAIN")
    }
  }
}
