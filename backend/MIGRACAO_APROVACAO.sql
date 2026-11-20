BEGIN;
ALTER TABLE desaparecido ADD COLUMN IF NOT EXISTS boletim_ocorrencia TEXT;
-- Registros antigos permanecem publicados; novos começam pendentes.
ALTER TABLE desaparecido ADD COLUMN IF NOT EXISTS status_aprovacao VARCHAR(20) NOT NULL DEFAULT 'aprovado' CHECK (status_aprovacao IN ('pendente','aprovado','reprovado'));
ALTER TABLE desaparecido ALTER COLUMN status_aprovacao SET DEFAULT 'pendente';
COMMIT;
