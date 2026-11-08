CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sightings (
  account_id TEXT NOT NULL,
  id TEXT NOT NULL,
  norad_id INTEGER NOT NULL,
  observed_at INTEGER NOT NULL,
  verified INTEGER NOT NULL,
  angle_error REAL,
  note TEXT,
  updated_at INTEGER NOT NULL,
  version INTEGER NOT NULL,
  PRIMARY KEY (account_id, id)
);

CREATE INDEX sightings_account_version ON sightings (account_id, version);
