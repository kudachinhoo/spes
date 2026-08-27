const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
require('dotenv').config();

const generateToken = (cpf) => {
  return jwt.sign({ cpf }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

exports.register = async (req, res) => {
  try {
    // Validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cpf, nome, email, senha } = req.body;

    // Verifica se email já existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Verifica se CPF já existe
    const existingCpf = await User.findByPk(cpf);
    if (existingCpf) {
      return res.status(400).json({ error: 'CPF já cadastrado' });
    }

    const user = await User.create({ cpf, nome, email, senha });
    const token = generateToken(user.cpf);

    res.status(201).json({
      success: true,
      token,
      user: {
        cpf: user.cpf,
        nome: user.nome,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    const user = await User.findOne({ where: { email } });
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
      user: {
        cpf: user.cpf,
        nome: user.nome,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userCpf, {
      attributes: ['cpf', 'nome', 'email']
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
};