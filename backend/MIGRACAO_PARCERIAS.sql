BEGIN;
CREATE TABLE IF NOT EXISTS propostas_parceria (
 id_proposta BIGSERIAL PRIMARY KEY,
 instituicao VARCHAR(160) NOT NULL,
 tipo_instituicao VARCHAR(80) NOT NULL,
 cnpj VARCHAR(18), site VARCHAR(250),
 localidade VARCHAR(120) NOT NULL,
 responsavel VARCHAR(140) NOT NULL, cargo VARCHAR(100),
 email VARCHAR(180) NOT NULL, telefone VARCHAR(20) NOT NULL,
 contribuicoes JSONB NOT NULL CHECK (jsonb_typeof(contribuicoes) = 'array'),
 proposta TEXT NOT NULL CHECK (char_length(trim(proposta)) BETWEEN 20 AND 3000),
 consentimento BOOLEAN NOT NULL CHECK (consentimento),
 status VARCHAR(20) NOT NULL DEFAULT 'recebida' CHECK (status IN ('recebida','em_analise','aceita','recusada')),
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_propostas_parceria_status ON propostas_parceria(status, criado_em DESC);
COMMIT;
