# Histórico de alterações — SPES

## Novas rotas

- `GET /api/people/mine` — lista as ocorrências cadastradas pelo usuário autenticado.
- `GET /api/people/:id/logs` — lista o histórico da ocorrência, apenas para o proprietário.
- `PUT /api/people/:id` — agora registra alterações automaticamente, dentro da mesma transação.

Use `Authorization: Bearer SEU_TOKEN` nas rotas protegidas.

## Banco

A nova tabela `ocorrencia_logs` é criada por `sequelize.sync()` na inicialização, desde que o usuário PostgreSQL tenha permissão `CREATE`. Não exige `DB_SYNC_ALTER=true` para criar a tabela nova. Logs de criação, edição e exclusão são registrados. Os logs de exclusão permanecem no banco para auditoria, mas não há rota pública para acessá-los depois da exclusão.

## Privacidade e segurança

Somente o proprietário consulta o histórico; a API nunca aceita o CPF do autor enviado pelo navegador. Campos sensíveis (`rg`, `contato`, `foto`, `locais_favoritos`) são registrados somente como “alterado”, sem valores. O campo `informacoes` é registrado com valores antigos e novos; não inclua dados sensíveis nele. Nenhuma rota de modificação de logs é exposta.

## Observações

A tela HTML de gerenciamento e edição ainda precisa ser conectada a estas rotas. O backend original não possui colunas latitude/longitude no modelo de desaparecidos, e as localizações do formulário podem não coincidir com o formato esperado; isso não foi alterado aqui.

Antes de implantar, faça backup do PostgreSQL. Teste em homologação e revise o controle de acesso. Não inclua `.env` no repositório.
