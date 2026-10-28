ALTER TABLE chess_classes ADD COLUMN center_id UUID REFERENCES centers(id);
ALTER TABLE chess_classes ADD COLUMN scope_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS chess_class_students (
  chess_class_id UUID NOT NULL REFERENCES chess_classes(id),
  student_id UUID NOT NULL REFERENCES student(id),
  PRIMARY KEY(chess_class_id, student_id)
);
-- Hibernate used a generated PK name in some older installations.
DO $$ DECLARE pk TEXT; BEGIN
  SELECT conname INTO pk FROM pg_constraint WHERE conrelid = 'chess_class_students'::regclass AND contype = 'p';
  IF pk IS NOT NULL THEN EXECUTE format('ALTER TABLE chess_class_students DROP CONSTRAINT %I', pk); END IF;
END $$;
ALTER TABLE chess_class_students ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE chess_class_students ADD COLUMN id UUID DEFAULT gen_random_uuid();
ALTER TABLE chess_class_students ADD PRIMARY KEY (id);
ALTER TABLE chess_class_students ADD COLUMN full_name VARCHAR(255);
ALTER TABLE chess_class_students ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE chess_class_students cs SET full_name = s.full_name FROM student s WHERE cs.student_id = s.id;

-- Former members with attendance need a durable membership as well.
INSERT INTO chess_class_students (chess_class_id, student_id, full_name, active)
SELECT DISTINCT se.class_id, a.student_id, s.full_name, FALSE
FROM session_attendance a JOIN class_sessions se ON se.id = a.session_id JOIN student s ON s.id = a.student_id
WHERE NOT EXISTS (SELECT 1 FROM chess_class_students cs WHERE cs.chess_class_id = se.class_id AND cs.student_id = a.student_id);
ALTER TABLE chess_class_students ALTER COLUMN full_name SET NOT NULL;
CREATE UNIQUE INDEX class_membership_profile_unique ON chess_class_students(chess_class_id, student_id) WHERE student_id IS NOT NULL;
UPDATE chess_classes c SET student_count = (SELECT count(*) FROM chess_class_students cs WHERE cs.chess_class_id = c.id AND cs.active);

ALTER TABLE session_attendance ADD COLUMN membership_id UUID REFERENCES chess_class_students(id) ON DELETE CASCADE;
UPDATE session_attendance a SET membership_id = cs.id FROM class_sessions se, chess_class_students cs
WHERE a.session_id = se.id AND cs.chess_class_id = se.class_id AND cs.student_id = a.student_id;
ALTER TABLE session_attendance ALTER COLUMN membership_id SET NOT NULL;
ALTER TABLE session_attendance ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE session_attendance DROP CONSTRAINT session_attendance_session_student_key;
ALTER TABLE session_attendance ADD CONSTRAINT session_attendance_session_membership_key UNIQUE(session_id, membership_id);

CREATE TABLE student_import_rows (
  import_id UUID NOT NULL,
  row_number INTEGER NOT NULL,
  class_id UUID NOT NULL REFERENCES chess_classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload_hash VARCHAR(64) NOT NULL,
  result_json TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (import_id, row_number)
);
