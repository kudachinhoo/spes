const crypto = require('crypto');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');

const tokenHash = value => crypto.createHash('sha256').update(value).digest('hex');
const generic = 'Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha.';
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 100;
const frontendUrl = () => (process.env.FRONTEND_URL || 'https://spes-kjx4.onrender.com').replace(/\/+$/, '');

// Gmail API via HTTPS: funciona também no Render Free, que bloqueia portas SMTP.
const gmailConfigured = () => ['GMAIL_ADDRESS', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN']
  .every(key => typeof process.env[key] === 'string' && process.env[key].trim());

async function sendResetEmail(to, link) {
  const params = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID,
    client_secret: process.env.GMAIL_CLIENT_SECRET,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
    signal: AbortSignal.timeout(12000)
  });
  if (!tokenResponse.ok) {
    console.error('Gmail OAuth: falha ao renovar access token, HTTP', tokenResponse.status);
    throw new Error('GMAIL_OAUTH_FAILURE');
  }
  const { access_token: accessToken } = await tokenResponse.json();
  if (!accessToken) throw new Error('GMAIL_MISSING_ACCESS_TOKEN');

  // Evita injeção de cabeçalhos MIME por entrada externa.
  if (!validEmail(to) || !validEmail(process.env.GMAIL_ADDRESS)) {
    throw new Error('GMAIL_INVALID_EMAIL');
  }
  const body = `Recebemos uma solicitação para redefinir sua senha do SPES.\n\n` +
    `Acesse o link abaixo (válido por 15 minutos):\n${link}\n\n` +
    `Se você não pediu a recuperação, ignore esta mensagem.`;
  const mime = [
    `From: ${process.env.GMAIL_ADDRESS}`,
    `To: ${to}`,
    'Subject: =?UTF-8?B?' + Buffer.from('SPES | Redefinição de senha', 'utf8').toString('base64') + '?=',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body, 'utf8').toString('base64')
  ].join('\r\n');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: Buffer.from(mime, 'utf8').toString('base64url') }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) {
    console.error('Gmail API: envio recusado, HTTP', response.status);
    throw new Error('GMAIL_SEND_FAILURE');
  }
}

exports.request = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!validEmail(email)) return res.status(400).json({ error: 'Informe um e-mail válido.' });

  if (!gmailConfigured()) {
    console.error('Recuperação indisponível: faltam as variáveis GMAIL_* no Render.');
    return res.status(503).json({ error: 'Recuperação de senha temporariamente indisponível.' });
  }

  let savedTokenHash;
  try {
    const user = await User.findOne({ where: sqlWhere(fn('lower', col('email')), email) });
    if (!user) return res.json({ message: generic });

    const token = crypto.randomBytes(32).toString('hex');
    savedTokenHash = tokenHash(token);
    const link = `${frontendUrl()}/redefinir-senha.html?token=${encodeURIComponent(token)}`;

    // Persistir ANTES de enviar: nunca entregar um link cujo token não está salvo.
    await sequelize.transaction(async transaction => {
      await PasswordReset.destroy({ where: { cpf_usuario: user.cpf }, transaction });
      await PasswordReset.create({
        cpf_usuario: user.cpf,
        token_hash: savedTokenHash,
        expira_em: new Date(Date.now() + 15 * 60 * 1000)
      }, { transaction });
    });

    try {
      await sendResetEmail(user.email, link);
    } catch (error) {
      // Impedir que um token cujo e-mail falhou permaneça válido.
      try {
        await PasswordReset.destroy({ where: { token_hash: savedTokenHash } });
      } catch (cleanupError) {
        console.error('Falha ao invalidar token após erro no envio:', cleanupError);
      }
      throw error;
    }

    return res.json({ message: generic });
  } catch (error) {
    console.error('Falha na recuperação de senha:', error);
    return res.status(503).json({ error: 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.' });
  }
};

exports.reset = async (req, res) => {
  const token = req.body?.token;
  const senha = req.body?.senha;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ error: 'Link inválido ou expirado.' });
  }
  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 128) {
    return res.status(400).json({ error: 'A nova senha deve ter entre 8 e 128 caracteres.' });
  }

  try {
    const changed = await sequelize.transaction(async transaction => {
      const entry = await PasswordReset.findOne({
        where: {
          token_hash: tokenHash(token),
          utilizado_em: null,
          expira_em: { [Op.gt]: new Date() }
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!entry) return false;
      const user = await User.findByPk(entry.cpf_usuario, { transaction });
      if (!user) return false;
      user.senha = senha;
      await user.save({ transaction }); // User.beforeUpdate cria o hash bcrypt.
      await PasswordReset.update({ utilizado_em: new Date() }, {
        where: { cpf_usuario: user.cpf, utilizado_em: null }, transaction
      });
      return true;
    });
    if (!changed) return res.status(400).json({ error: 'Link inválido, expirado ou já utilizado.' });
    return res.json({ message: 'Senha alterada com sucesso. Faça login novamente.' });
  } catch (error) {
    console.error('Falha ao redefinir senha:', error);
    return res.status(500).json({ error: 'Não foi possível alterar a senha.' });
  }
};
