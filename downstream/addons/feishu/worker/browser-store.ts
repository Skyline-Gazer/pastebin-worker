export interface BrowserSession {
  id: string
  principalKey: string
  csrfToken: string
  createdAt: string
  expiresAt: string
}

export class BrowserTrustStore {
  constructor(private readonly db: D1Database) {}
  async saveOAuthState(state: string, expiresAt: string) {
    await this.db
      .prepare("INSERT INTO feishu_oauth_states (state, expires_at) VALUES (?, ?)")
      .bind(state, expiresAt)
      .run()
  }
  async consumeOAuthState(state: string, now: string) {
    const row = await this.db
      .prepare("SELECT expires_at FROM feishu_oauth_states WHERE state = ?")
      .bind(state)
      .first<{ expires_at: string }>()
    await this.db.prepare("DELETE FROM feishu_oauth_states WHERE state = ?").bind(state).run()
    return !!row && row.expires_at > now
  }
  async createSession(session: BrowserSession) {
    await this.db
      .prepare(
        "INSERT INTO feishu_browser_sessions (id, principal_key, csrf_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(session.id, session.principalKey, session.csrfToken, session.createdAt, session.expiresAt)
      .run()
  }
  async getSession(id: string, now: string): Promise<BrowserSession | null> {
    const row = await this.db
      .prepare(
        "SELECT id, principal_key, csrf_token, created_at, expires_at FROM feishu_browser_sessions WHERE id = ? AND expires_at > ?",
      )
      .bind(id, now)
      .first<{ id: string; principal_key: string; csrf_token: string; created_at: string; expires_at: string }>()
    return (
      row && {
        id: row.id,
        principalKey: row.principal_key,
        csrfToken: row.csrf_token,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }
    )
  }
  async deleteSession(id: string) {
    await this.db.prepare("DELETE FROM feishu_browser_sessions WHERE id = ?").bind(id).run()
  }
  async upsertPrincipalScope(principalKey: string, scopeId: string) {
    const now = new Date().toISOString()
    await this.db
      .prepare(
        "INSERT INTO feishu_principal_scope_map (principal_key, scope_id, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(principal_key, scope_id) DO UPDATE SET updated_at = excluded.updated_at",
      )
      .bind(principalKey, scopeId, now, now)
      .run()
  }
  async scopes(principalKey: string): Promise<string[]> {
    const result = await this.db
      .prepare("SELECT scope_id FROM feishu_principal_scope_map WHERE principal_key = ?")
      .bind(principalKey)
      .all<{ scope_id: string }>()
    return result.results.map((row) => row.scope_id)
  }
}
