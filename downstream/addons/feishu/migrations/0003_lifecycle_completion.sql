-- SQLite cannot widen CHECK constraints in place. This transactional table
-- replacement preserves every existing binding and operation. It is not a
-- reset or data backfill.
PRAGMA foreign_keys = OFF;
DROP INDEX IF EXISTS feishu_one_mutation;

ALTER TABLE feishu_bindings RENAME TO feishu_bindings_v1;
CREATE TABLE feishu_bindings (
  id TEXT PRIMARY KEY,
  scope_id TEXT NOT NULL,
  record_key TEXT NOT NULL,
  credential TEXT NOT NULL,
  paste_name TEXT,
  visibility TEXT NOT NULL DEFAULT 'active' CHECK (visibility IN ('active', 'archived')),
  retention_mode TEXT NOT NULL DEFAULT 'permanent' CHECK (retention_mode IN ('permanent', 'timed')),
  expires_at TEXT,
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (scope_id, record_key),
  CHECK ((retention_mode = 'permanent' AND expires_at IS NULL) OR (retention_mode = 'timed' AND expires_at IS NOT NULL))
);
INSERT INTO feishu_bindings SELECT * FROM feishu_bindings_v1;
DROP TABLE feishu_bindings_v1;

ALTER TABLE feishu_operations RENAME TO feishu_operations_v1;
CREATE TABLE feishu_operations (
  id TEXT PRIMARY KEY,
  scope_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('create', 'update', 'complete_permanent', 'complete_expiring', 'delete')),
  fingerprint TEXT NOT NULL,
  content_fingerprint TEXT NOT NULL,
  expected_version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'dispatched', 'succeeded', 'failed', 'reconciliation_required')),
  result TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (scope_id, request_id)
);
INSERT INTO feishu_operations SELECT * FROM feishu_operations_v1;
DROP TABLE feishu_operations_v1;
CREATE UNIQUE INDEX feishu_one_mutation ON feishu_operations(entry_id)
WHERE status IN ('reserved', 'dispatched', 'reconciliation_required');
PRAGMA foreign_keys = ON;
