-- Photos de visite : les images sont dans Netlify Blobs (magasin « visit-photos »),
-- la base garde la référence. `blob_key` désigne la photo ; sa vignette est rangée sous `blob_key || '.thumb'`.
CREATE TABLE inspection_photos (
  id SERIAL PRIMARY KEY,
  inspection_id INT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  blob_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX inspection_photos_inspection_idx ON inspection_photos (inspection_id, id);
