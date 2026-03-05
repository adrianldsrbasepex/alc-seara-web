-- Delete obsolete vehicles
DELETE FROM vehicles 
WHERE plate IN ('TJD-3L99', 'TJJ-9C53', 'TKE-4A87');
