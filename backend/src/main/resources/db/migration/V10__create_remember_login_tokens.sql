CREATE TABLE IF NOT EXISTS remember_login_tokens (
  token_hash VARCHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS remember_login_tokens_expiry_idx ON remember_login_tokens(expires_at);
