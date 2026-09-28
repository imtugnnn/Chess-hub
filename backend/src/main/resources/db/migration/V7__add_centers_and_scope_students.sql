-- A center is a shared workspace purchased and owned by an existing user.
CREATE TABLE centers (
  id UUID PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  subscription_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  subscription_plan_code VARCHAR(64),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT centers_subscription_status_check
    CHECK (subscription_status IN ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'))
);

CREATE INDEX centers_owner_user_idx ON centers(owner_user_id);

-- A user may participate in more than one center and has an explicit role in each.
CREATE TABLE center_memberships (
  center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'TEACHER',
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (center_id, user_id),
  CONSTRAINT center_memberships_role_check
    CHECK (role IN ('OWNER', 'ADMIN', 'TEACHER')),
  CONSTRAINT center_memberships_status_check
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'LEFT'))
);

CREATE INDEX center_memberships_user_idx ON center_memberships(user_id) WHERE status = 'ACTIVE';

-- Invitations target users that already exist in the system.
CREATE TABLE center_invitations (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(32) NOT NULL DEFAULT 'TEACHER',
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT center_invitations_role_check
    CHECK (role IN ('ADMIN', 'TEACHER')),
  CONSTRAINT center_invitations_status_check
    CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'))
);

CREATE UNIQUE INDEX center_invitations_pending_unique_idx
  ON center_invitations(center_id, invited_user_id)
  WHERE status = 'PENDING';

CREATE INDEX center_invitations_invited_user_idx
  ON center_invitations(invited_user_id)
  WHERE status = 'PENDING';

-- Keep student.id as the only technical identifier. Phone numbers are attributes,
-- not global identifiers, and a student belongs to either one center or one user.
ALTER TABLE student
  ADD COLUMN center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
  ADD COLUMN owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN parent_name VARCHAR(255),
  ADD COLUMN birth_date DATE,
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE student
  ALTER COLUMN phone_number DROP NOT NULL;

DROP INDEX IF EXISTS student_phone_number_key;

CREATE INDEX student_center_idx ON student(center_id) WHERE center_id IS NOT NULL;
CREATE INDEX student_owner_user_idx ON student(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- These indexes prevent duplicates inside one data scope without leaking or
-- conflating students between different centers or individual users.
CREATE UNIQUE INDEX student_center_identity_unique_idx
  ON student(center_id, full_name, birth_date, parent_phone_number)
  WHERE center_id IS NOT NULL;

CREATE UNIQUE INDEX student_owner_identity_unique_idx
  ON student(owner_user_id, full_name, birth_date, parent_phone_number)
  WHERE owner_user_id IS NOT NULL;

-- Existing records do not contain scope, parent name, or birth date. Leave those
-- fields nullable during migration; enforce the following invariant after backfill
-- and after the application writes the new scope columns for every new student:
--
-- ALTER TABLE student
--   ALTER COLUMN parent_name SET NOT NULL,
--   ALTER COLUMN birth_date SET NOT NULL,
--   ADD CONSTRAINT student_exactly_one_owner_check CHECK (
--     (center_id IS NOT NULL AND owner_user_id IS NULL)
--     OR (center_id IS NULL AND owner_user_id IS NOT NULL)
--   );
