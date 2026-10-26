-- Execute no pgAdmin conectado ao banco de produção, após backup.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS papel VARCHAR(20) NOT NULL DEFAULT 'usuario';
-- Substitua pelo CPF exato de uma conta já cadastrada, nunca use CPF fictício.
-- UPDATE usuario SET papel = 'admin' WHERE cpf = 'CPF_DA_CONTA_EXISTENTE';
-- SELECT cpf, nome, email, papel FROM usuario WHERE papel = 'admin';
