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
  try { res.json(await MissingPerson.findAll({ attributes: ['id_desaparecido','nome','status','cidade','estado_desaparecimento','cpf_usuario','data_desaparecimento','status_aprovacao'], order: [['id_desaparecido','DESC']], limit: 200 })); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao listar ocorrências' }); }
});
router.get('/logs', async (req, res) => {
  try { res.json(await OccurrenceLog.findAll({ order: [['criado_em','DESC']], limit: 200 })); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao listar auditoria' }); }
});
router.get('/occurrences/:id/boletim', async (req,res) => {
 try {
  const p = await MissingPerson.findByPk(req.params.id, {attributes:['boletim_ocorrencia']});
  if (!p || !p.boletim_ocorrencia) return res.status(404).json({error:'B.O. não disponível'});
  const [head,data] = p.boletim_ocorrencia.split(',');
  const ext = head.includes('pdf') ? 'pdf' : head.includes('png') ? 'png' : 'jpg';
  res.set({'Access-Control-Expose-Headers':'Content-Disposition','Cache-Control':'no-store','Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="boletim.${ext}"`,'X-Content-Type-Options':'nosniff'});
  return res.send(Buffer.from(data,'base64'));
 } catch(e) { return res.status(500).json({error:'Erro ao consultar B.O.'}); }
});
router.patch('/occurrences/:id/aprovacao', async (req,res) => {
 const status = req.body.status_aprovacao;
 if (!['aprovado','reprovado'].includes(status)) return res.status(400).json({error:'Decisão inválida'});
 try {
  const result = await MissingPerson.sequelize.transaction(async t => {
   const p = await MissingPerson.findByPk(req.params.id,{transaction:t,lock:t.LOCK.UPDATE});
   if (!p || p.status_aprovacao !== 'pendente' || !p.boletim_ocorrencia) return false;
   await p.update({status_aprovacao:status},{transaction:t});
   await OccurrenceLog.create({id_desaparecido:p.id_desaparecido,cpf_usuario:req.userCpf,acao:'edicao',alteracoes:{status_aprovacao:{antes:'pendente',depois:status}}},{transaction:t});
   return true;
  });
  return result ? res.json({success:true}) : res.status(409).json({error:'Ocorrência indisponível para análise'});
 } catch(e) { return res.status(500).json({error:'Erro ao registrar decisão'}); }
});
module.exports = router;
