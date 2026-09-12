ALTER TABLE feishu_oauth_states ADD COLUMN provider TEXT NOT NULL DEFAULT 'feishu';
ALTER TABLE feishu_browser_sessions ADD COLUMN provider TEXT NOT NULL DEFAULT 'feishu';
