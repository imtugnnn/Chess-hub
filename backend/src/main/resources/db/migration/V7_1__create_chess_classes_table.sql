-- Older databases already have this table; a fresh database needs it before V8.
CREATE TABLE IF NOT EXISTS chess_classes (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  schedule VARCHAR(255) NOT NULL,
  student_count INTEGER NOT NULL DEFAULT 0,
  tone VARCHAR(255) NOT NULL
);
