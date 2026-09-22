CREATE TABLE IF NOT EXISTS student (
  id UUID PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(15) NOT NULL,
  parent_phone_number VARCHAR(15) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS student_phone_number_key ON student(phone_number);
