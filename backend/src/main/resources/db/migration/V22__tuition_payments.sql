CREATE TABLE tuition_payments (
  id uuid PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES chess_classes(id) ON DELETE CASCADE,
  identity_id uuid NOT NULL,
  report_month varchar(7) NOT NULL,
  collected boolean NOT NULL DEFAULT false,
  amount numeric(18,0) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  revision bigint NOT NULL DEFAULT 0,
  updated_by uuid NOT NULL,
  updated_by_name varchar(255) NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (class_id, identity_id, report_month)
);
CREATE TABLE tuition_payment_events (
  id uuid PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES tuition_payments(id) ON DELETE CASCADE,
  collected boolean NOT NULL,
  expected_revision bigint NOT NULL,
  expected_tuition numeric(18,0) NOT NULL,
  previous_amount numeric(18,0) NOT NULL,
  amount numeric(18,0) NOT NULL,
  actor_id uuid NOT NULL,
  actor_name varchar(255) NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX tuition_payment_events_history ON tuition_payment_events(payment_id, created_at DESC);
