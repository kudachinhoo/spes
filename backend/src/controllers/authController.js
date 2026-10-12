const { fn, col, where: sqlWhere } = require('sequelize');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const generateToken = (cpf) => {
  return jwt.sign({ cpf }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Busca ignorando maiúsculas/minúsculas (comparação exata em minúsculas,
// sem curingas, para não casar com o e-mail de outra pessoa).
const buscarPorEmail = (email) =>
  User.findOne({
    where: sqlWhere(fn('lower', col('email')), String(email).trim().toLowerCase())
  });

const dadosPublicosDoUsuario = (user) => ({
  cpf: user.cpf,
  nome: user.nome,
  email: user.email
});

exports.register = async (req, res) => {
  try {
    // As validações (CPF, e-mail, senha...) rodam antes, em authRoutes.
    const { cpf, nome, email, senha, telefone } = req.body;

    // Verifica se email já existe
    const existingUser = await buscarPorEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Verifica se CPF já existe
    const existingCpf = await User.findByPk(cpf);
    if (existingCpf) {
      return res.status(400).json({ error: 'CPF já cadastrado' });
    }

    const user = await User.create({ cpf, nome, email, senha, telefone: telefone || null });
    const token = generateToken(user.cpf);

    res.status(201).json({
      success: true,
      token,
      user: dadosPublicosDoUsuario(user)
    });
  } catch (error) {
    // Duas pessoas cadastrando o mesmo e-mail/CPF ao mesmo tempo
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Email ou CPF já cadastrado' });
    }
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    const user = await buscarPorEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const validPassword = await user.comparePassword(senha);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const token = generateToken(user.cpf);

    res.json({
      success: true,
      token,
      user: dadosPublicosDoUsuario(user)
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

// Login com Google: o site manda o access_token que o Google entregou ao navegador.
// 1) confirmamos que o token foi emitido para o NOSSO app (client id);
// 2) buscamos o e-mail verificado do usuário;
// 3) entramos se já existir conta com esse e-mail.
// Quem ainda não tem conta precisa se cadastrar antes, porque o SPES exige CPF.
exports.google = async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('GOOGLE_CLIENT_ID não configurado');
      return res.status(500).json({ error: 'Login com Google indisponível no momento' });
    }

    const { access_token } = req.body;

    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(access_token)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!infoRes.ok) {
      return res.status(401).json({ error: 'Token do Google inválido' });
    }
    const info = await infoRes.json();
    if (info.aud !== clientId && info.azp !== clientId) {
      return res.status(401).json({ error: 'Token do Google não pertence a este site' });
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(8000)
    });
    if (!userRes.ok) {
      return res.status(401).json({ error: 'Não foi possível validar sua conta Google' });
    }
    const googleUser = await userRes.json();

    const emailVerificado = googleUser.email_verified === true || googleUser.email_verified === 'true';
    if (!googleUser.email || !emailVerificado) {
      return res.status(401).json({ error: 'Sua conta Google não tem um e-mail verificado' });
    }

    const user = await buscarPorEmail(googleUser.email);
    if (!user) {
      return res.status(404).json({
        error: 'Não encontramos uma conta com este e-mail do Google. Faça o cadastro primeiro.'
      });
    }

    res.json({
      success: true,
      token: generateToken(user.cpf),
      user: dadosPublicosDoUsuario(user)
    });
  } catch (error) {
    console.error('Erro no login com Google:', error);
    res.status(500).json({ error: 'Erro ao entrar com Google' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userCpf, {
      attributes: ['cpf', 'nome', 'email', 'telefone']
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
};
