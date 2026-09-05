-- Phase 9.3: completed batches retain only their sanitized public response.
-- This is additive because the Phase 9.2 status CHECK deliberately has no
-- completed value. The presence of this one-to-one row is the completed state.
CREATE TABLE feishu_batch_results (
  batch_id TEXT PRIMARY KEY REFERENCES feishu_batch_operations(id),
  result TEXT NOT NULL,
  created_at TEXT NOT NULL
);
