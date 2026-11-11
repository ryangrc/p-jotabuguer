CREATE TABLE IF NOT EXISTS cloud_users (
 id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
 password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('admin','operator')),
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cloud_setup (id integer PRIMARY KEY CHECK(id=1));
CREATE TABLE IF NOT EXISTS cloud_sessions (
 hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES cloud_users(id),
 csrf text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS cloud_sessions_user ON cloud_sessions(user_id);
CREATE TABLE IF NOT EXISTS cloud_limits (
 key text PRIMARY KEY, count integer NOT NULL, until_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS cloud_resets (
 hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES cloud_users(id), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS cloud_store (
 id integer PRIMARY KEY CHECK(id=1), revision integer NOT NULL DEFAULT 0,
 data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cloud_history (
 revision integer PRIMARY KEY, data jsonb NOT NULL, actor uuid REFERENCES cloud_users(id),
 reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cloud_audit (
 id uuid PRIMARY KEY, user_id uuid REFERENCES cloud_users(id), action text NOT NULL,
 detail text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cloud_requests (
 user_id uuid NOT NULL REFERENCES cloud_users(id), request_id uuid NOT NULL,
 digest text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,request_id)
);
