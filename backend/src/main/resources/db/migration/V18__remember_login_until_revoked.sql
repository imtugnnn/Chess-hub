ALTER TABLE remember_login_tokens ALTER COLUMN expires_at DROP NOT NULL;

-- Preserve active remembered logins without reviving already expired tokens.
DELETE FROM remember_login_tokens WHERE expires_at <= CURRENT_TIMESTAMP;
UPDATE remember_login_tokens SET expires_at = NULL;
