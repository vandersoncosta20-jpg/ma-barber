CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  service_id TEXT NOT NULL,
  barber_id TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL,
  free_cut INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appt_barber_date ON appointments (barber_id, date);
CREATE INDEX IF NOT EXISTS idx_appt_phone ON appointments (client_phone);

CREATE TABLE IF NOT EXISTS holds (
  date TEXT NOT NULL,
  barber_id TEXT NOT NULL,
  start_min INTEGER NOT NULL,
  appointment_id TEXT NOT NULL,
  PRIMARY KEY (date, barber_id, start_min)
);

CREATE TABLE IF NOT EXISTS client_holds (
  date TEXT NOT NULL,
  phone TEXT NOT NULL,
  start_min INTEGER NOT NULL,
  appointment_id TEXT NOT NULL,
  PRIMARY KEY (date, phone, start_min)
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
