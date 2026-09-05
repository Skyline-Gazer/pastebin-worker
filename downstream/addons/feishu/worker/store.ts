export interface Binding {
  id: string
  scope_id: string
  record_key: string
  credential: string
  paste_name: string | null
  visibility: "active" | "archived"
  retention_mode: "permanent" | "timed"
  expires_at: string | null
  version: number
}

export interface Operation {
  id: string
  scope_id: string
  request_id: string
  entry_id: string
  kind: "create" | "update" | "complete_permanent" | "complete_expiring" | "delete"
  fingerprint: string
  content_fingerprint: string
  expected_version: number
  status: "reserved" | "dispatched" | "succeeded" | "failed" | "reconciliation_required"
  result: string | null
}

export class BindingStore {
  constructor(private readonly db: D1Database) {}

  get(scope: string, id: string): Promise<Binding | null> {
    return this.db
      .prepare("SELECT * FROM feishu_bindings WHERE scope_id = ? AND id = ?")
      .bind(scope, id)
      .first<Binding>()
  }

  getById(id: string): Promise<Binding | null> {
    return this.db.prepare("SELECT * FROM feishu_bindings WHERE id = ?").bind(id).first<Binding>()
  }

  operation(scope: string, requestId: string): Promise<Operation | null> {
    return this.db
      .prepare("SELECT * FROM feishu_operations WHERE scope_id = ? AND request_id = ?")
      .bind(scope, requestId)
      .first<Operation>()
  }

  pending(id: string): Promise<Operation | null> {
    return this.db
      .prepare(
        "SELECT * FROM feishu_operations WHERE entry_id = ? AND status IN ('reserved', 'dispatched', 'reconciliation_required')",
      )
      .bind(id)
      .first<Operation>()
  }

  private insertOperation(op: Operation, now: string): D1PreparedStatement {
    return this.db
      .prepare(
        `INSERT INTO feishu_operations
      (id, scope_id, request_id, entry_id, kind, fingerprint, content_fingerprint, expected_version, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'reserved', ?, ?)`,
      )
      .bind(
        op.id,
        op.scope_id,
        op.request_id,
        op.entry_id,
        op.kind,
        op.fingerprint,
        op.content_fingerprint,
        op.expected_version,
        now,
        now,
      )
  }

  async reserveCreate(binding: Binding, op: Operation): Promise<void> {
    const now = new Date().toISOString()
    // D1 batch is transactional: a request/record conflict rolls back both inserts.
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO feishu_bindings
        (id, scope_id, record_key, credential, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(binding.id, binding.scope_id, binding.record_key, binding.credential, now, now),
      this.insertOperation(op, now),
    ])
  }

  async reserveUpdate(op: Operation): Promise<boolean> {
    const now = new Date().toISOString()
    // The version check and insertion are one statement, not a read-then-write race.
    // The partial unique index rejects another outstanding mutation on this entry.
    const result = await this.db
      .prepare(
        `INSERT INTO feishu_operations
      (id, scope_id, request_id, entry_id, kind, fingerprint, content_fingerprint, expected_version, status, created_at, updated_at)
      SELECT ?, ?, ?, id, 'update', ?, ?, ?, 'reserved', ?, ? FROM feishu_bindings
      WHERE id = ? AND scope_id = ? AND version = ? AND paste_name IS NOT NULL`,
      )
      .bind(
        op.id,
        op.scope_id,
        op.request_id,
        op.fingerprint,
        op.content_fingerprint,
        op.expected_version,
        now,
        now,
        op.entry_id,
        op.scope_id,
        op.expected_version,
      )
      .run()
    return result.meta.changes === 1
  }

  async reserveCompletion(op: Operation): Promise<boolean> {
    const now = new Date().toISOString()
    const result = await this.db
      .prepare(
        `INSERT INTO feishu_operations
        (id, scope_id, request_id, entry_id, kind, fingerprint, content_fingerprint, expected_version, status, created_at, updated_at)
        SELECT ?, ?, ?, id, ?, ?, ?, ?, 'reserved', ?, ? FROM feishu_bindings
        WHERE id = ? AND scope_id = ? AND version = ? AND paste_name IS NOT NULL
        AND visibility = 'active' AND retention_mode = 'permanent' AND expires_at IS NULL`,
      )
      .bind(
        op.id,
        op.scope_id,
        op.request_id,
        op.kind,
        op.fingerprint,
        op.content_fingerprint,
        op.expected_version,
        now,
        now,
        op.entry_id,
        op.scope_id,
        op.expected_version,
      )
      .run()
    return result.meta.changes === 1
  }

  async dispatch(id: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        "UPDATE feishu_operations SET status = 'dispatched', updated_at = ? WHERE id = ? AND status = 'reserved'",
      )
      .bind(new Date().toISOString(), id)
      .run()
    return result.meta.changes === 1
  }

  async rememberName(op: Operation, name: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE feishu_bindings SET paste_name = ?, updated_at = ? WHERE id = ?
      AND EXISTS (SELECT 1 FROM feishu_operations WHERE id = ? AND status = 'dispatched')`,
      )
      .bind(name, new Date().toISOString(), op.entry_id, op.id)
      .run()
  }

  async uncertain(id: string): Promise<void> {
    await this.db
      .prepare(
        "UPDATE feishu_operations SET status = 'reconciliation_required', updated_at = ? WHERE id = ? AND status = 'dispatched'",
      )
      .bind(new Date().toISOString(), id)
      .run()
  }

  async fail(id: string): Promise<void> {
    await this.db
      .prepare("UPDATE feishu_operations SET status = 'failed', updated_at = ? WHERE id = ? AND status = 'dispatched'")
      .bind(new Date().toISOString(), id)
      .run()
  }

  async finish(op: Operation, result: string): Promise<void> {
    const now = new Date().toISOString()
    const results = await this.db.batch([
      this.db
        .prepare(
          `UPDATE feishu_bindings SET version = version + 1, updated_at = ? WHERE id = ? AND version = ?
        AND EXISTS (SELECT 1 FROM feishu_operations WHERE id = ? AND status = 'dispatched')`,
        )
        .bind(now, op.entry_id, op.expected_version, op.id),
      this.db
        .prepare(
          `UPDATE feishu_operations SET status = 'succeeded', result = ?, updated_at = ?
        WHERE id = ? AND status = 'dispatched'
        AND EXISTS (SELECT 1 FROM feishu_bindings WHERE id = ? AND version = ?)`,
        )
        .bind(result, now, op.id, op.entry_id, op.expected_version + 1),
    ])
    if (results.some((row) => row.meta.changes !== 1)) throw new Error("STATE_CONFLICT")
  }

  async finishCompletion(
    op: Operation,
    result: string,
    visibility: "archived",
    retention: "permanent" | "timed",
    expiresAt: string | null,
  ): Promise<void> {
    const now = new Date().toISOString()
    const results = await this.db.batch([
      this.db
        .prepare(
          `UPDATE feishu_bindings SET visibility = ?, retention_mode = ?, expires_at = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ? AND EXISTS (SELECT 1 FROM feishu_operations WHERE id = ? AND status = 'dispatched')`,
        )
        .bind(visibility, retention, expiresAt, now, op.entry_id, op.expected_version, op.id),
      this.db
        .prepare(
          `UPDATE feishu_operations SET status = 'succeeded', result = ?, updated_at = ? WHERE id = ? AND status = 'dispatched' AND EXISTS (SELECT 1 FROM feishu_bindings WHERE id = ? AND version = ?)`,
        )
        .bind(result, now, op.id, op.entry_id, op.expected_version + 1),
    ])
    if (results.some((row) => row.meta.changes !== 1)) throw new Error("STATE_CONFLICT")
  }

  async finishDelete(op: Operation): Promise<void> {
    const now = new Date().toISOString()
    const results = await this.db.batch([
      this.db
        .prepare(
          "UPDATE feishu_operations SET status = 'succeeded', result = '{}', updated_at = ? WHERE id = ? AND status = 'dispatched'",
        )
        .bind(now, op.id),
      this.db
        .prepare("DELETE FROM feishu_bindings WHERE id = ? AND version = ?")
        .bind(op.entry_id, op.expected_version),
    ])
    if (results.some((row) => row.meta.changes !== 1)) throw new Error("STATE_CONFLICT")
  }
}
