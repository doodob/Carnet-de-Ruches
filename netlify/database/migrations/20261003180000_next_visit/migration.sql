-- Prochaine visite prévue pour chaque ruche : une date à planifier, effacée quand la visite est faite.
ALTER TABLE hives ADD COLUMN next_visit_on DATE;
