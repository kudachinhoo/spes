const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const passwordReset = require('../controllers/passwordResetController');
const validar = require('../middleware/validar');

// Limite mais apertado para login/cadastro (dificulta tentativa de adivinhar senha)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' }
});

// Validações para registro
const registerValidation = [
  body('cpf').matches(/^\d{11}$/).withMessage('CPF deve ter 11 números, sem pontos ou traço'),
  body('nome').trim().isLength({ min: 2, max: 100 }).withMessage('Nome é obrigatório'),
  body('email').trim().toLowerCase().isEmail().withMessage('Email inválido'),
  body('telefone').optional().trim().isLength({ max: 20 }).withMessage('Telefone muito longo'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres')
];

const loginValidation = [
  body('email').trim().toLowerCase().isEmail().withMessage('Email inválido'),
  body('senha').isString().notEmpty().withMessage('Senha é obrigatória')
];

const googleValidation = [
  body('access_token').isString().notEmpty().withMessage('Token do Google é obrigatório')
];

router.post('/register', authLimiter, registerValidation, validar, authController.register);
router.post('/login', authLimiter, loginValidation, validar, authController.login);
router.post('/google', authLimiter, googleValidation, validar, authController.google);
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Muitas solicitações. Tente novamente em alguns minutos.' }
});
router.post('/forgot-password', resetLimiter, passwordReset.request);
router.post('/reset-password', resetLimiter, passwordReset.reset);
router.get('/profile', auth, authController.getProfile);

module.exports = router;
