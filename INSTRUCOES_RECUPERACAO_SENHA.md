# Recuperação de senha — SPES

1. Faça backup do PostgreSQL.
2. No pgAdmin, execute `backend/MIGRACAO_RECUPERACAO_SENHA.sql`.
3. No Render, configure `RESEND_API_KEY`, `MAIL_FROM` e `FRONTEND_URL`.
   - `RESEND_API_KEY`: chave privada do serviço de e-mails Resend.
   - `MAIL_FROM`: remetente autorizado por um domínio verificado no Resend.
   - `FRONTEND_URL`: URL da pasta do GitHub Pages, sem barra final.
   - **Não coloque a chave no HTML, GitHub ou arquivo .env versionado.**
4. Publique a pasta `backend/` atualizada no serviço Render que realmente executa a API.
5. Publique na raiz do GitHub Pages `Tela de login.htm`, `esqueci-senha.html` e `redefinir-senha.html`.
6. Teste com uma conta sua e confira o e-mail recebido e a expiração de 15 minutos.

IMPORTANTE: O ZIP enviado contém também uma pasta antiga `SPES_painel_admin/` com cópias duplicadas. Não use essa pasta para publicar o backend; use `backend/` na raiz.

Os endpoints são POST /api/auth/forgot-password {email} e POST /api/auth/reset-password {token,senha}.
A senha é armazenada pelo hook bcrypt existente do modelo User. Os tokens são armazenados apenas como SHA-256 e utilizados uma vez.
A API não envia e-mails sem as variáveis de ambiente configuradas.
