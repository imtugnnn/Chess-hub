CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  position geography(Point, 4326) NOT NULL,
  checkin_radius_m integer NOT NULL DEFAULT 30 CHECK (checkin_radius_m BETWEEN 10 AND 30),
  max_accuracy_m integer NOT NULL DEFAULT 30 CHECK (max_accuracy_m BETWEEN 5 AND 30),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS locations_position_gix ON locations USING gist (position);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('CENTER_ADMIN', 'TEACHER', 'PARENT', 'STUDENT')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  student_code text NOT NULL,
  full_name text NOT NULL,
  date_of_birth date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (center_id, student_code)
);

CREATE TABLE IF NOT EXISTS guardian_students (
  guardian_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'parent',
  PRIMARY KEY (guardian_user_id, student_id)
);

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  name text NOT NULL,
  level text,
  tuition_per_session integer NOT NULL DEFAULT 0 CHECK (tuition_per_session >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_teachers (
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at date NOT NULL DEFAULT current_date,
  ended_at date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  location_id uuid NOT NULL REFERENCES locations(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  topic text NOT NULL DEFAULT '',
  objectives text NOT NULL DEFAULT '',
  materials jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(materials) = 'array'),
  checkin_open_minutes integer NOT NULL DEFAULT 30 CHECK (checkin_open_minutes BETWEEN 0 AND 240),
  checkin_close_minutes integer NOT NULL DEFAULT 45 CHECK (checkin_close_minutes BETWEEN 0 AND 240),
  late_after_minutes integer NOT NULL DEFAULT 15 CHECK (late_after_minutes BETWEEN 0 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  EXCLUDE USING gist (
    teacher_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status <> 'cancelled')
);

CREATE INDEX IF NOT EXISTS class_sessions_class_time_idx ON class_sessions (class_id, starts_at);
CREATE INDEX IF NOT EXISTS class_sessions_teacher_time_idx ON class_sessions (teacher_id, starts_at);

CREATE TABLE IF NOT EXISTS attendance (
  session_id uuid NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'late', 'excused', 'absent')),
  source text NOT NULL CHECK (source IN ('self_checkin', 'teacher_manual', 'center_manual')),
  checked_in_at timestamptz,
  captured_at timestamptz,
  device_position geography(Point, 4326),
  accuracy_m numeric(8,2),
  distance_m numeric(10,2),
  note text,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, student_id)
);

CREATE TABLE IF NOT EXISTS tuition_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id),
  billing_month date NOT NULL CHECK (date_trunc('month', billing_month)::date = billing_month),
  valid_sessions integer NOT NULL CHECK (valid_sessions >= 0),
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  total_amount integer GENERATED ALWAYS AS (valid_sessions * unit_price) STORED,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'void')),
  paid_at timestamptz,
  UNIQUE (student_id, billing_month)
);

CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  starts_at timestamptz
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  seed integer,
  PRIMARY KEY (tournament_id, student_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round integer NOT NULL CHECK (round > 0),
  board integer NOT NULL CHECK (board > 0),
  white_student_id uuid REFERENCES students(id),
  black_student_id uuid REFERENCES students(id),
  winner_student_id uuid REFERENCES students(id),
  result text,
  UNIQUE (tournament_id, round, board)
);
