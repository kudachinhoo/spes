-- Execute no Query Tool do pgAdmin, após fazer backup.
CREATE TABLE IF NOT EXISTS recuperacao_senha (
 id BIGSERIAL PRIMARY KEY,
 cpf_usuario VARCHAR(11) NOT NULL REFERENCES usuario(cpf) ON DELETE CASCADE,
 token_hash VARCHAR(64) NOT NULL UNIQUE,
 expira_em TIMESTAMPTZ NOT NULL,
 utilizado_em TIMESTAMPTZ,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recuperacao_cpf ON recuperacao_senha(cpf_usuario);
