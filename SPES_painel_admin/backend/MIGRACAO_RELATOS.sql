CREATE TABLE IF NOT EXISTS relatos (
 id BIGSERIAL PRIMARY KEY,
 id_desaparecido INTEGER REFERENCES desaparecido(id_desaparecido) ON DELETE SET NULL,
 tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('avistamento','informacao','outro')),
 descricao TEXT NOT NULL CHECK (char_length(trim(descricao)) BETWEEN 10 AND 2000),
 local_informado VARCHAR(160), data_avistamento DATE, periodo VARCHAR(20), contato VARCHAR(120),
 status VARCHAR(30) NOT NULL DEFAULT 'recebido' CHECK (status IN ('recebido','em_analise','encaminhado','encerrado')),
 nota_admin TEXT, criado_em TIMESTAMPTZ NOT NULL DEFAULT now(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_relatos_ocorrencia ON relatos(id_desaparecido);
CREATE INDEX IF NOT EXISTS idx_relatos_status ON relatos(status);
