const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const { QueryTypes } = require('sequelize');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const types = ['empresa','ong','orgao_publico','ensino','coletivo','pessoa_fisica','outro'];
const contributions = ['divulgacao','tecnologia','financeiro','voluntariado','institucional','servicos','pesquisa','outro'];
router.post('/', rateLimit({windowMs:3600000,max:5,message:{error:'Limite de propostas atingido. Tente mais tarde.'}}), async (req,res) => {
 const b = req.body || {}; const vals = {};
 for (const [key,max,required] of [['instituicao',160,true],['tipoInstituicao',80,true],['cnpj',18,false],['site',250,false],['localidade',120,true],['responsavel',140,true],['cargo',100,false],['email',180,true],['telefone',20,true],['proposta',3000,true]]) {
  const v = b[key]; if (v != null && typeof v !== 'string') return res.status(400).json({error:'Campo inválido: '+key});
  vals[key] = (v || '').trim() || null;
  if ((required && !vals[key]) || (vals[key] && vals[key].length > max)) return res.status(400).json({error:'Campo inválido: '+key});
 }
 if (!types.includes(vals.tipoInstituicao) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.email) || !/^\+?[\d\s().-]{8,20}$/.test(vals.telefone) || vals.proposta.length < 20 || b.consentimento !== true || !Array.isArray(b.contribuicoes) || !b.contribuicoes.length || b.contribuicoes.length > 8 || !b.contribuicoes.every(x=>contributions.includes(x))) return res.status(400).json({error:'Revise os dados e o consentimento.'});
 if (vals.site) { try { if (!['http:','https:'].includes(new URL(vals.site).protocol)) throw Error(); } catch {return res.status(400).json({error:'Site inválido.'});} }
 vals.contribuicoes = JSON.stringify([...new Set(b.contribuicoes)]);
 try { const rows = await db.query(`INSERT INTO propostas_parceria (instituicao,tipo_instituicao,cnpj,site,localidade,responsavel,cargo,email,telefone,contribuicoes,proposta,consentimento) VALUES (:instituicao,:tipoInstituicao,:cnpj,:site,:localidade,:responsavel,:cargo,:email,:telefone,CAST(:contribuicoes AS jsonb),:proposta,true) RETURNING id_proposta`,{replacements:vals,type:QueryTypes.SELECT}); return res.status(201).json({success:true,id_proposta:rows[0].id_proposta}); } catch {return res.status(500).json({error:'Não foi possível salvar a proposta.'});}
});
router.get('/admin',auth,admin,async(req,res)=>{try {res.json(await db.query('SELECT * FROM propostas_parceria ORDER BY criado_em DESC LIMIT 200',{type:QueryTypes.SELECT}));}catch{res.status(500).json({error:'Erro ao consultar propostas.'});}});
module.exports = router;
