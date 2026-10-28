ALTER TABLE tournament_rounds ADD COLUMN pairing_note VARCHAR(1000);
ALTER TABLE tournament_rounds ADD COLUMN pairing_search_limited BOOLEAN NOT NULL DEFAULT FALSE;
