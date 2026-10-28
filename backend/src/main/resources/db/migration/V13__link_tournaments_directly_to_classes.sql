ALTER TABLE tournaments ADD COLUMN class_id UUID REFERENCES chess_classes(id);
UPDATE tournaments t SET class_id = s.class_id FROM class_sessions s WHERE t.session_id = s.id;
CREATE INDEX ix_tournaments_class ON tournaments(class_id);
