# Administrador do SPES

1. Faça backup do banco PostgreSQL.
2. Execute `backend/MIGRACAO_ADMIN.sql` no pgAdmin.
3. Substitua CPF_DA_CONTA_EXISTENTE pelo CPF real de uma conta previamente criada e execute o UPDATE comentado. **Não crie admin pelo formulário público.**
4. Publique o backend no Render e o frontend no GitHub Pages.
5. Faça login com a conta promovida e abra `Admin.html`.
6. Verifique que usuários comuns recebem HTTP 403 em `/api/admin/users` e não podem editar ocorrências alheias.

O painel lista usuários, ocorrências e auditoria; administradores podem editar/excluir ocorrências por meio da página Minhas ocorrências. A edição de contas de usuários, a restauração de ocorrências excluídas e o gerenciamento de configurações globais NÃO foram implementados.

**Atenção:** o banco contém dados sensíveis. O painel é protegido por autenticação e verificação do papel no servidor; não divulgue o acesso admin. Limites de 200 registros nas listagens administrativas.

Não testado em PostgreSQL/Render de produção.
