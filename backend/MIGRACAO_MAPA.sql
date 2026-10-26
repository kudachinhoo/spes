-- Execute no pgAdmin após backup. Preserva registros anteriores.
ALTER TABLE localizacao ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE localizacao ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE localizacao ADD COLUMN IF NOT EXISTS ordem INTEGER;
-- Registros antigos sem três coordenadas não permitem reconstruir a triangulação.
