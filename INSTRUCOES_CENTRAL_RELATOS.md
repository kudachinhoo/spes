# Central de Relatos SPES — Instalação

1. Faça backup do banco PostgreSQL no Render antes da implantação.
2. Execute `SPES_painel_admin/backend/MIGRACAO_RELATOS.sql` no banco via pgAdmin ou psql (confirme primeiro que a tabela `desaparecido` existe e que `id_desaparecido` é INTEGER).
3. Publique o backend atualizado em `SPES_painel_admin/backend` e confirme GET `/api/health`.
4. Publique os arquivos HTML da raiz `spes-main` no frontend (em especial `Enviar informacao.html`, `Minhas ocorrencias.html`, `Admin.html`, `Central de relatos admin.html`).
5. Teste um envio sem ID (relato geral) e outro via `detalhes.html?id=ID_VALIDO` (relato vinculado). Verifique que ambos aparecem na Central administrativa e não são públicos.
6. Administrador: abrir `Central de relatos admin.html`, analisar o relato e alterar para `encaminhado` apenas se for adequado disponibilizar ao responsável. O responsável visualiza o relato liberado em `Minhas ocorrencias.html` > Informações recebidas. O contato permanece exclusivo do administrador.

## Segurança e limites
- POST público limitado a 4 relatos por hora por IP; recomenda-se CAPTCHA, moderação e monitoramento antes de divulgação pública.
- Não inclua documentos, fotos ou endereços particulares no relato; revise o texto antes de liberar ao responsável.
- O status `encaminhado` não significa verificação factual do relato.
- Os relatos gerais ficam exclusivamente na Central administrativa.
- O formulário envia dados reais após a publicação do backend. Configure privacidade/LGPD, política de retenção e processo de atendimento antes de ativar em produção.
- O banco não envia notificações automaticamente: os usuários consultam os relatos na página privada.
