const crypto = require('crypto');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const generic = 'Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha.';
const site = () => process.env.FRONTEND_URL || 'https://kudachinhoo.github.io/spes';
const emailValido = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 100;

exports.request = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailValido(email)) return res.status(400).json({ error: 'Informe um e-mail válido.' });
  // Sem provedor configurado, não fingir que o envio foi realizado.
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    console.error('Recuperação indisponível: RESEND_API_KEY e MAIL_FROM não configurados.');
    return res.status(503).json({ error: 'Recuperação por e-mail indisponível no momento.' });
  }
  try {
    const user = await User.findOne({ where: sqlWhere(fn('lower', col('email')), email) });
    if (!user) return res.json({ message: generic });
    const token = crypto.randomBytes(32).toString('hex');
    const link = `${site().replace(/\/$/, '')}/redefinir-senha.html?token=${encodeURIComponent(token)}`;
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: [user.email],
        subject: 'SPES — redefinição de senha',
        text: `Você solicitou a redefinição de senha do SPES. Acesse este link em até 15 minutos: ${link}\n\nSe não solicitou, ignore este e-mail.`
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!result.ok) {
      console.error('Falha no envio do e-mail de recuperação:', result.status);
      return res.status(503).json({ error: 'Não foi possível enviar o e-mail agora. Tente mais tarde.' });
    }
    await sequelize.transaction(async t => {
      await PasswordReset.destroy({ where: { cpf_usuario: user.cpf }, transaction: t });
      await PasswordReset.create({
        cpf_usuario: user.cpf, token_hash: hash(token),
        expira_em: new Date(Date.now() + 15 * 60 * 1000)
      }, { transaction: t });
    });
    return res.json({ message: generic });
  } catch (error) {
    console.error('Erro ao solicitar recuperação:', error);
    return res.status(500).json({ error: 'Não foi possível processar a solicitação.' });
  }
};

exports.reset = async (req, res) => {
  const { token, senha } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
    return res.status(400).json({ error: 'Link inválido ou expirado.' });
  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 128)
    return res.status(400).json({ error: 'A nova senha deve ter entre 8 e 128 caracteres.' });
  try {
    const result = await sequelize.transaction(async t => {
      const entry = await PasswordReset.findOne({
        where: { token_hash: hash(token), utilizado_em: null, expira_em: { [Op.gt]: new Date() } },
        transaction: t, lock: t.LOCK.UPDATE
      });
      if (!entry) return false;
      const user = await User.findByPk(entry.cpf_usuario, { transaction: t });
      if (!user) return false;
      user.senha = senha;
      await user.save({ transaction: t }); // hook beforeUpdate gera bcrypt
      await PasswordReset.update({ utilizado_em: new Date() }, {
        where: { cpf_usuario: user.cpf, utilizado_em: null }, transaction: t
      });
      return true;
    });
    if (!result) return res.status(400).json({ error: 'Link inválido, expirado ou já utilizado.' });
    return res.json({ message: 'Senha alterada com sucesso. Faça login novamente.' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return res.status(500).json({ error: 'Não foi possível alterar a senha.' });
  }
};
