-- Add batch-level evidence without changing binding or per-entry lifecycle ownership.
CREATE TABLE feishu_batch_operations (
  id TEXT PRIMARY KEY,
  principal_key TEXT NOT NULL,
  request_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('archive_permanent', 'archive_expiring', 'delete')),
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('dispatched', 'reconciliation_required')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (principal_key, request_id)
);

CREATE TABLE feishu_batch_items (
  batch_id TEXT NOT NULL REFERENCES feishu_batch_operations(id),
  entry_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  scope_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('succeeded', 'failed')),
  code TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (batch_id, entry_id)
);
