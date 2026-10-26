const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { Op } = require('sequelize');
const User = require('../models/User');
const MissingPerson = require('../models/MissingPerson');
const OccurrenceLog = require('../models/OccurrenceLog');
router.use(auth, admin);
router.get('/summary', async (req, res) => {
  try { res.json({ users: await User.count(), occurrences: await MissingPerson.count(), edits: await OccurrenceLog.count() }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Erro no painel' }); }
});
router.get('/users', async (req, res) => {
  try { res.json(await User.findAll({ attributes: ['cpf','nome','email','telefone','papel'], order: [['nome','ASC']], limit: 200 })); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao listar usuários' }); }
});
router.get('/occurrences', async (req, res) => {
  try { res.json(await MissingPerson.findAll({ attributes: ['id_desaparecido','nome','status','cidade','estado_desaparecimento','cpf_usuario','data_desaparecimento'], order: [['id_desaparecido','DESC']], limit: 200 })); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao listar ocorrências' }); }
});
router.get('/logs', async (req, res) => {
  try { res.json(await OccurrenceLog.findAll({ order: [['criado_em','DESC']], limit: 200 })); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao listar auditoria' }); }
});
module.exports = router;
