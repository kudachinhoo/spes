-- Faça backup antes de executar no pgAdmin.
ALTER TABLE desaparecido ADD COLUMN IF NOT EXISTS fotos JSONB NOT NULL DEFAULT '[]'::jsonb;
-- Preserva fotos antigas como primeira imagem da galeria.
UPDATE desaparecido SET fotos = jsonb_build_array(foto)
WHERE foto IS NOT NULL AND foto <> '' AND fotos = '[]'::jsonb;
