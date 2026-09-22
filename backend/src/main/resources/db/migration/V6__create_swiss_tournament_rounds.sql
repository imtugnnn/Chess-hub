CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES class_sessions(id),
  round_count INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  student_id UUID NOT NULL REFERENCES student(id),
  initial_seed INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS initial_seed INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_participants_tournament_student ON tournament_participants(tournament_id, student_id);

CREATE TABLE IF NOT EXISTS tournament_tie_breaks (
  id UUID PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  tie_break_type VARCHAR(64) NOT NULL,
  sort_order INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_tie_breaks_tournament_type ON tournament_tie_breaks(tournament_id, tie_break_type);

CREATE TABLE IF NOT EXISTS tournament_rounds (
  id UUID PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  round_number INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL,
  finalized_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_rounds_tournament_number ON tournament_rounds(tournament_id, round_number);

CREATE TABLE IF NOT EXISTS tournament_pairings (
  id UUID PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES tournament_rounds(id),
  board_number INTEGER NOT NULL,
  white_participant_id UUID NOT NULL REFERENCES tournament_participants(id),
  black_participant_id UUID REFERENCES tournament_participants(id),
  result VARCHAR(32) NOT NULL,
  result_recorded_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_pairings_round_board ON tournament_pairings(round_id, board_number);
