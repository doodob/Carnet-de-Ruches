-- Modèles de ruche : le nombre de cadres pilote le formulaire de visite.
CREATE TABLE hive_models (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  body_frames INT NOT NULL CHECK (body_frames > 0),
  super_frames INT NOT NULL CHECK (super_frames >= 0)
);

INSERT INTO hive_models (name, body_frames, super_frames) VALUES ('Dadant 10', 10, 10);

-- Ruchers, avec position GPS optionnelle.
CREATE TABLE apiaries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  altitude_m INT,
  notes TEXT
);

CREATE TABLE hives (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  model_id INT NOT NULL REFERENCES hive_models(id),
  apiary_id INT REFERENCES apiaries(id) ON DELETE SET NULL,
  installed_on DATE,
  origin TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dead', 'merged', 'sold')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE queens (
  id SERIAL PRIMARY KEY,
  hive_id INT NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
  birth_year INT,
  origin TEXT,
  strain TEXT,
  marking_color TEXT,
  introduced_on DATE,
  replaced_on DATE
);

CREATE TABLE inspections (
  id SERIAL PRIMARY KEY,
  hive_id INT NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  temperature_c DOUBLE PRECISION,
  wind TEXT,
  sky TEXT,
  queen_seen BOOLEAN,
  eggs_seen BOOLEAN,
  brood_frames INT,
  bee_frames INT,
  honey_frames INT,
  pollen_frames INT,
  supers_count INT,
  temper SMALLINT CHECK (temper BETWEEN 1 AND 5),
  queen_cells BOOLEAN,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  frame_layout JSONB,
  notes TEXT
);

CREATE TABLE treatments (
  id SERIAL PRIMARY KEY,
  hive_id INT NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  dose TEXT,
  reason TEXT,
  started_on DATE NOT NULL,
  ended_on DATE,
  notes TEXT
);

CREATE TABLE feedings (
  id SERIAL PRIMARY KEY,
  hive_id INT NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
  fed_on DATE NOT NULL,
  feed_type TEXT NOT NULL,
  quantity_kg DOUBLE PRECISION
);

CREATE TABLE harvests (
  id SERIAL PRIMARY KEY,
  hive_id INT NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
  harvested_on DATE NOT NULL,
  quantity_kg DOUBLE PRECISION NOT NULL,
  honey_type TEXT,
  notes TEXT
);

CREATE INDEX inspections_hive_date_idx ON inspections (hive_id, inspected_at DESC);
CREATE INDEX queens_hive_idx ON queens (hive_id);
CREATE INDEX treatments_hive_idx ON treatments (hive_id, started_on DESC);
CREATE INDEX feedings_hive_idx ON feedings (hive_id, fed_on DESC);
CREATE INDEX harvests_hive_idx ON harvests (hive_id, harvested_on DESC);
