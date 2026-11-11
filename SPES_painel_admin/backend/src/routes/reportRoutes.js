const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param } = require('express-validator');
const validar = require('../middleware/validar');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Report = require('../models/Report');
const MissingPerson = require('../models/MissingPerson');
const router = express.Router();
const envioLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 4, standardHeaders: true, legacyHeaders: false, message: { error: 'Limite de envios atingido. Tente mais tarde.' } });
const campos = [
  body('id_desaparecido').optional({ nullable: true }).isInt({ min: 1 }),
  body('tipo').isIn(['avistamento','informacao','outro']),
  body('descricao').isString().trim().isLength({ min: 10, max: 2000 }),
  body('local_informado').optional({ nullable: true }).isString().trim().isLength({ max: 160 }),
  body('data_avistamento').optional({ nullable: true }).isISO8601({ strict: true }).custom(v => new Date(v) <= new Date()),
  body('periodo').optional({ nullable: true }).isIn(['','Manhã','Tarde','Noite','Madrugada']),
  body('contato').optional({ nullable: true }).isString().trim().isLength({ max: 120 })
];
router.post('/', envioLimit, campos, validar, async (req,res) => {
 try {
  const id = req.body.id_desaparecido || null;
  if(id && !(await MissingPerson.findByPk(id))) return res.status(404).json({error:'Ocorrência não encontrada'});
  const clean = (v) => typeof v === 'string' ? v.trim() || null : null;
  const relato = await Report.create({ id_desaparecido:id, tipo:req.body.tipo, descricao:clean(req.body.descricao), local_informado:clean(req.body.local_informado), data_avistamento:req.body.data_avistamento || null, periodo:clean(req.body.periodo), contato:clean(req.body.contato) });
  return res.status(201).json({message:'Relato recebido para análise. Ele não será publicado automaticamente.', protocolo:String(relato.id)});
 } catch(e) { console.error('Erro ao receber relato:',e); return res.status(500).json({error:'Não foi possível receber o relato'}); }
});
router.get('/minhas-ocorrencias/:id', auth, param('id').isInt({min:1}), validar, async (req,res)=>{
 try {
  const p = await MissingPerson.findByPk(req.params.id);
  if(!p || p.cpf_usuario !== req.userCpf) return res.status(404).json({error:'Ocorrência não encontrada'});
  const rows = await Report.findAll({where:{id_desaparecido:p.id_desaparecido,status:'encaminhado'},attributes:['id','tipo','descricao','local_informado','data_avistamento','periodo','criado_em'],order:[['criado_em','DESC']],limit:100});
  res.json(rows);
 } catch(e) { console.error(e);res.status(500).json({error:'Erro ao consultar relatos'}); }
});
router.get('/admin',auth,admin,async(req,res)=>{
 try {res.json(await Report.findAll({order:[['criado_em','DESC']],limit:200}));}
 catch(e){console.error(e);res.status(500).json({error:'Erro ao consultar central'});}
});
router.patch('/admin/:id',auth,admin,param('id').isInt({min:1}),body('status').isIn(['recebido','em_analise','encaminhado','encerrado']),body('nota_admin').optional().isString().isLength({max:2000}),validar,async(req,res)=>{
 try {const r=await Report.findByPk(req.params.id);if(!r)return res.status(404).json({error:'Relato não encontrado'});
  if(req.body.status==='encaminhado' && !r.id_desaparecido)return res.status(400).json({error:'Relatos gerais não podem ser encaminhados para Minhas ocorrências'});
  await r.update({status:req.body.status,nota_admin:typeof req.body.nota_admin==='string'?req.body.nota_admin:r.nota_admin,atualizado_em:new Date()});
  res.json({message:'Status atualizado',id:String(r.id),status:r.status});
 }catch(e){console.error(e);res.status(500).json({error:'Erro ao atualizar relato'});}
});
module.exports=router;
