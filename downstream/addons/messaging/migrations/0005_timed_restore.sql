-- Add the timed restore claim while preserving all existing durable rows.
PRAGMA foreign_keys = OFF;
DROP INDEX IF EXISTS feishu_one_mutation;
ALTER TABLE feishu_operations RENAME TO feishu_operations_v4;
CREATE TABLE feishu_operations (
  id TEXT PRIMARY KEY,
  scope_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('create', 'update', 'complete_permanent', 'complete_expiring', 'restore_permanent', 'restore_timed', 'delete')),
  fingerprint TEXT NOT NULL,
  content_fingerprint TEXT NOT NULL,
  expected_version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'dispatched', 'succeeded', 'failed', 'reconciliation_required')),
  result TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (scope_id, request_id)
);
INSERT INTO feishu_operations SELECT * FROM feishu_operations_v4;
DROP TABLE feishu_operations_v4;
CREATE UNIQUE INDEX feishu_one_mutation ON feishu_operations(entry_id)
WHERE status IN ('reserved', 'dispatched', 'reconciliation_required');
PRAGMA foreign_keys = ON;
