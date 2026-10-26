const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const personController = require('../controllers/personController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const optionalAdmin = require('../middleware/optionalAdmin');
const validar = require('../middleware/validar');

const ESTADOS = [
  'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal',
  'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul',
  'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí',
  'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia',
  'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
];
const ETNIAS = ['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena', 'Outra'];

// aceita hoje mesmo (com 1 dia de folga por causa de fuso horário)
const naoFutura = (valor) => new Date(valor) <= new Date(Date.now() + 24 * 60 * 60 * 1000);

const validarFoto = (valor) => {
  if (typeof valor !== 'string' || !/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(valor)) {
    throw new Error('Foto inválida. Envie uma imagem PNG, JPG ou WEBP.');
  }
  if (valor.length > 700000) {
    throw new Error('Foto muito grande.');
  }
  return true;
};

// criar = true  -> nome, estado e data do desaparecimento são obrigatórios
// criar = false -> edição: tudo opcional, mas o que vier precisa ser válido
const regrasPessoa = (criar) => {
  const obrigatorio = (cadeia) => (criar ? cadeia : cadeia.optional());

  const regras = [
    obrigatorio(body('nome')).trim()
      .isLength({ min: 2, max: 150 }).withMessage('Nome deve ter entre 2 e 150 caracteres'),
    obrigatorio(body('estado_desaparecimento'))
      .isIn(ESTADOS).withMessage('Estado inválido'),
    obrigatorio(body('data_desaparecimento'))
      .isISO8601({ strict: true }).withMessage('Data do desaparecimento inválida').bail()
      .custom(naoFutura).withMessage('A data do desaparecimento não pode ser futura'),

    body('data_nascimento').optional()
      .isISO8601({ strict: true }).withMessage('Data de nascimento inválida').bail()
      .custom(naoFutura).withMessage('A data de nascimento não pode ser futura'),
    body('etnia').optional().isIn(ETNIAS).withMessage('Cor/raça inválida'),
    body('altura').optional().isFloat({ min: 30, max: 250 }).withMessage('Altura deve estar entre 30 e 250 cm'),
    body('peso').optional().isFloat({ min: 1, max: 400 }).withMessage('Peso deve estar entre 1 e 400 kg'),
    body('rg').optional().trim().isLength({ max: 20 }).withMessage('RG deve ter no máximo 20 caracteres'),
    body('cidade').optional().trim().isLength({ max: 100 }).withMessage('Cidade muito longa'),
    body('informacoes').optional().trim().isLength({ max: 2000 }).withMessage('Informações muito longas (máximo 2000 caracteres)'),
    body('contato').optional().trim().isLength({ max: 20 }).withMessage('Contato muito longo'),
    body('ultimas_localizacoes').optional().trim().isLength({ max: 500 }).withMessage('Últimas localizações muito longas (máximo 500 caracteres)'),
    body('foto').optional().custom(validarFoto)
  ];

  if (!criar) {
    regras.push(body('status').optional().isIn(['desaparecido', 'encontrado']).withMessage('Status inválido'));
  }
  return regras;
};

const idValido = param('id').isInt({ min: 1 }).withMessage('ID inválido');

router.post('/', auth, regrasPessoa(true), validar, personController.create);
router.get('/', personController.findAll);
router.get('/mine', auth, personController.findMine);
router.get('/mine/:id', auth, optionalAdmin, idValido, validar, personController.findMineOne);
router.get('/stats', personController.getStats); // antes de '/:id'
router.get('/:id', idValido, validar, personController.findOne);
router.get('/:id/logs', auth, optionalAdmin, idValido, validar, personController.getLogs);
router.put('/:id', auth, optionalAdmin, idValido, regrasPessoa(false), validar, personController.update);
router.delete('/:id', auth, optionalAdmin, idValido, validar, personController.delete);

module.exports = router;
