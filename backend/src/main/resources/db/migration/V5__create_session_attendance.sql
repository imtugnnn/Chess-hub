CREATE TABLE IF NOT EXISTS session_attendance (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  noted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT session_attendance_status_check CHECK (status IN ('PRESENT', 'ABSENT', 'LATE')),
  CONSTRAINT session_attendance_session_student_key UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS session_attendance_session_idx ON session_attendance(session_id);
