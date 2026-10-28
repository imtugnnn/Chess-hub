CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  center_id UUID,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE users ALTER COLUMN center_id DROP NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.chess_classes') IS NOT NULL THEN
    ALTER TABLE chess_classes DROP CONSTRAINT IF EXISTS fkkmy3o7eviph3pvqa5eenajr98;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.teacher_accounts') IS NOT NULL THEN
    INSERT INTO users (id, email, full_name, role, password_hash, created_at)
    SELECT id, email, full_name, role, password_hash, created_at
    FROM teacher_accounts
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        created_at = EXCLUDED.created_at;
  END IF;
END $$;

ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.chess_classes') IS NOT NULL THEN
    ALTER TABLE chess_classes
      ADD CONSTRAINT chess_classes_teacher_id_fkey
      FOREIGN KEY (teacher_id) REFERENCES users(id);
  END IF;
END $$;

DROP TABLE IF EXISTS teacher_accounts;
