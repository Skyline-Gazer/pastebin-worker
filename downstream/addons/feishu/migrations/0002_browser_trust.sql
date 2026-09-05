CREATE TABLE feishu_browser_sessions (
  id TEXT PRIMARY KEY,
  principal_key TEXT NOT NULL,
  csrf_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX feishu_browser_sessions_expiry ON feishu_browser_sessions(expires_at);

CREATE TABLE feishu_principal_scope_map (
  principal_key TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (principal_key, scope_id)
);

CREATE TABLE feishu_oauth_states (
  state TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL
);

CREATE INDEX feishu_oauth_states_expiry ON feishu_oauth_states(expires_at);
