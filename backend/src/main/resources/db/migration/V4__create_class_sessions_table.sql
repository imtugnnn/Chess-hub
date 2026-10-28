CREATE TABLE IF NOT EXISTS class_sessions (
  id UUID PRIMARY KEY,
  class_id UUID NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CONSTRAINT class_sessions_time_range_check CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS class_sessions_class_date_idx ON class_sessions(class_id, session_date);
