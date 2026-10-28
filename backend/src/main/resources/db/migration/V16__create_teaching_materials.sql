CREATE TABLE teaching_materials (
  id UUID PRIMARY KEY,
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(4000) NOT NULL DEFAULT '',
  source_url VARCHAR(2048),
  file_name VARCHAR(255),
  content_type VARCHAR(128),
  file_data BYTEA,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT material_owner_check CHECK ((owner_user_id IS NULL) <> (center_id IS NULL)),
  CONSTRAINT material_source_check CHECK ((source_url IS NULL) <> (file_data IS NULL))
);
CREATE INDEX teaching_materials_owner_idx ON teaching_materials(owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX teaching_materials_center_idx ON teaching_materials(center_id) WHERE deleted_at IS NULL;

CREATE TABLE session_materials (
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES teaching_materials(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, material_id)
);
