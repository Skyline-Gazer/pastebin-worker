export class PasteError extends Error {
  constructor(readonly code: "UPSTREAM_REJECTED" | "UPSTREAM_UNCERTAIN" | "ENTRY_NOT_FOUND" | "UPSTREAM_INVALID") {
    super(code)
  }
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

  private async request(url: string, init: RequestInit): Promise<Response> {
    let response: Response
    try {
      response = await this.transport(url, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: this.authorization ? { Authorization: this.authorization } : undefined,
      })
    } catch {
      throw new PasteError("UPSTREAM_UNCERTAIN")
    }
    if (response.status === 404) throw new PasteError("ENTRY_NOT_FOUND")
    if (!response.ok) {
      throw new PasteError(response.status >= 400 && response.status < 500 ? "UPSTREAM_REJECTED" : "UPSTREAM_UNCERTAIN")
    }
    return response
  }

  private async write(path: string, method: string, content: string, password?: string): Promise<string> {
    const body = new FormData()
    body.set("c", content)
    body.set("e", "never")
    if (password) body.set("s", password)
    if (method === "POST") body.set("p", "1")
    const response = await this.request(`${this.origin}${path}`, { method, body })
    try {
      const data = await response.json<Record<string, unknown>>()
      if (data.expireAt !== null || data.expirationSeconds !== null || typeof data.url !== "string") throw new Error()
      const url = new URL(data.url)
      const name = url.pathname.slice(1)
      if (data.url !== this.publicUrl(name)) throw new Error()
      return name
    } catch {
      throw new PasteError("UPSTREAM_INVALID")
    }
  }

  create(content: string, password: string): Promise<string> {
    return this.write("/", "POST", content, password)
  }

  async update(name: string, password: string, content: string): Promise<void> {
    this.publicUrl(name)
    if (!/^[a-f0-9]{64}$/.test(password)) throw new PasteError("UPSTREAM_INVALID")
    const returned = await this.write(`/${name}:${password}`, "PUT", content)
    if (returned !== name) throw new PasteError("UPSTREAM_INVALID")
  }

  async permanent(name: string): Promise<void> {
    this.publicUrl(name)
    const response = await this.request(`${this.origin}/m/${name}`, { method: "GET" })
    try {
      const metadata = await response.json<Record<string, unknown>>()
      if (metadata.expireAt !== null) throw new Error()
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
