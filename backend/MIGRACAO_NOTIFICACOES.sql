BEGIN;
ALTER TABLE relatos ADD COLUMN IF NOT EXISTS nota_admin TEXT;
CREATE TABLE IF NOT EXISTS notificacoes (
 id BIGSERIAL PRIMARY KEY,
 cpf_usuario VARCHAR(11) NOT NULL,
 id_desaparecido INTEGER NOT NULL,
 tipo VARCHAR(40) NOT NULL,
 mensagem VARCHAR(240) NOT NULL,
 lida_em TIMESTAMPTZ,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notificacoes_usuario_leitura_data ON notificacoes(cpf_usuario,lida_em,criado_em);
COMMIT;
