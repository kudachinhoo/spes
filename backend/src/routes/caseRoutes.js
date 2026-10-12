const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const caseController = require('../controllers/caseController');
const auth = require('../middleware/auth');
const validar = require('../middleware/validar');

router.get('/states', caseController.getAllStates);
router.get('/state/:state', caseController.getCasesByState);
router.put(
  '/:id/status',
  auth,
  param('id').isInt({ min: 1 }).withMessage('ID inválido'),
  body('status').isIn(['desaparecido', 'encontrado']).withMessage('Status inválido'),
  validar,
  caseController.updateCaseStatus
);

module.exports = router;
