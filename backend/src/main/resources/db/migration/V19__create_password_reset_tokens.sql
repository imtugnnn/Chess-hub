CREATE TABLE password_reset_tokens (
  token_hash VARCHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash_at_request VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX password_reset_tokens_user_idx ON password_reset_tokens(user_id);
