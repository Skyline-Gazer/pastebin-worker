CREATE TABLE feishu_bindings (
  id TEXT PRIMARY KEY,
  scope_id TEXT NOT NULL,
  record_key TEXT NOT NULL,
  credential TEXT NOT NULL,
  paste_name TEXT,
  visibility TEXT NOT NULL DEFAULT 'active' CHECK (visibility = 'active'),
  retention_mode TEXT NOT NULL DEFAULT 'permanent' CHECK (retention_mode = 'permanent'),
  expires_at TEXT CHECK (expires_at IS NULL),
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (scope_id, record_key)
);

CREATE TABLE feishu_operations (
  id TEXT PRIMARY KEY,
  scope_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  entry_id TEXT NOT NULL REFERENCES feishu_bindings(id),
  kind TEXT NOT NULL CHECK (kind IN ('create', 'update')),
  fingerprint TEXT NOT NULL,
  content_fingerprint TEXT NOT NULL,
  expected_version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'dispatched', 'succeeded', 'failed', 'reconciliation_required')),
  result TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (scope_id, request_id)
);

CREATE UNIQUE INDEX feishu_one_mutation ON feishu_operations(entry_id)
WHERE status IN ('reserved', 'dispatched', 'reconciliation_required');
