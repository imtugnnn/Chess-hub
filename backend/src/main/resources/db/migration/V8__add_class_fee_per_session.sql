ALTER TABLE chess_classes
  ADD COLUMN IF NOT EXISTS fee_per_session NUMERIC(12, 0) NOT NULL DEFAULT 0;

ALTER TABLE chess_classes
  ADD CONSTRAINT chess_classes_fee_per_session_check CHECK (fee_per_session >= 0);
