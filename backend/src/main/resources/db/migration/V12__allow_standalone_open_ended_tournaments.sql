ALTER TABLE tournaments ADD COLUMN teacher_id UUID REFERENCES users(id);
ALTER TABLE tournaments ADD COLUMN name VARCHAR(255);
UPDATE tournaments t SET teacher_id = c.teacher_id, name = c.name
FROM class_sessions s JOIN chess_classes c ON c.id = s.class_id WHERE t.session_id = s.id;
ALTER TABLE tournaments ALTER COLUMN teacher_id SET NOT NULL;
ALTER TABLE tournaments ALTER COLUMN name SET NOT NULL;
ALTER TABLE tournaments ALTER COLUMN session_id DROP NOT NULL;
CREATE INDEX ix_tournaments_teacher_created ON tournaments(teacher_id, created_at DESC);

ALTER TABLE tournament_participants ADD COLUMN full_name VARCHAR(255);
UPDATE tournament_participants p SET full_name = s.full_name FROM student s WHERE p.student_id = s.id;
ALTER TABLE tournament_participants ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE tournament_participants ALTER COLUMN student_id DROP NOT NULL;

-- The count now describes rounds already created, rather than a planned limit.
UPDATE tournaments t SET round_count = (SELECT COUNT(*) FROM tournament_rounds r WHERE r.tournament_id = t.id);
