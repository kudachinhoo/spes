const crypto = require('crypto');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');

const tokenHash = value => crypto.createHash('sha256').update(value).digest('hex');
const generic = 'Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha.';
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 100;
const frontendUrl = () => (process.env.FRONTEND_URL || 'https://kudachinhoo.github.io/spes').replace(/\/+$/, '');

async function sendResetEmail(to, link) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [to],
      subject: 'SPES | Redefinição de senha',
      text: `Recebemos uma solicitação para redefinir sua senha do SPES.\n\nAbra este link (válido por 15 minutos):\n${link}\n\nSe não foi você, ignore esta mensagem.`,
      headers: { 'X-Entity-Ref-ID': crypto.randomUUID() }
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) {
    console.error('Resend não aceitou a solicitação:', response.status);
    throw new Error('EMAIL_PROVIDER_FAILURE');
  }
}

exports.request = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!validEmail(email)) return res.status(400).json({ error: 'Informe um e-mail válido.' });

  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    console.error('Recuperação indisponível: configure RESEND_API_KEY e MAIL_FROM no Render.');
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
