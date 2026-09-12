ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_checkin_radius_m_check;
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_max_accuracy_m_check;

ALTER TABLE locations ALTER COLUMN checkin_radius_m SET DEFAULT 30;
ALTER TABLE locations ALTER COLUMN max_accuracy_m SET DEFAULT 30;

UPDATE locations SET checkin_radius_m = 30 WHERE checkin_radius_m NOT BETWEEN 10 AND 30;
UPDATE locations SET max_accuracy_m = 30 WHERE max_accuracy_m NOT BETWEEN 5 AND 30;

ALTER TABLE locations ADD CONSTRAINT locations_checkin_radius_m_check CHECK (checkin_radius_m BETWEEN 10 AND 30);
ALTER TABLE locations ADD CONSTRAINT locations_max_accuracy_m_check CHECK (max_accuracy_m BETWEEN 5 AND 30);
