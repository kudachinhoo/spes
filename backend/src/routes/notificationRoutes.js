const router = require('express').Router();
const { param } = require('express-validator');
const auth = require('../middleware/auth');
const validar = require('../middleware/validar');
const Notification = require('../models/Notification');
router.use(auth);
router.get('/', async (req, res) => {
 try {
  const [itens, nao_lidas] = await Promise.all([
   Notification.findAll({ where: { cpf_usuario: req.userCpf }, attributes: ['id','id_desaparecido','tipo','mensagem','lida_em','criado_em'], order: [['criado_em','DESC'],['id','DESC']], limit: 50 }),
   Notification.count({ where: { cpf_usuario: req.userCpf, lida_em: null } })
  ]);
  res.json({ itens, nao_lidas });
 } catch (e) { console.error(e); res.status(500).json({ error: 'Não foi possível consultar as notificações.' }); }
});
router.patch('/ler-todas', async (req, res) => {
 try {
  await Notification.update({ lida_em: new Date() }, { where: { cpf_usuario: req.userCpf, lida_em: null } });
  res.json({ success: true });
 } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao marcar notificações.' }); }
});
router.patch('/:id/lida', param('id').isInt({ min: 1 }), validar, async (req, res) => {
 try {
  const item = await Notification.findOne({ where: { id: req.params.id, cpf_usuario: req.userCpf } });
  if (!item) return res.status(404).json({ error: 'Notificação não encontrada.' });
  if (!item.lida_em) await item.update({ lida_em: new Date() });
  res.json({ success: true });
 } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao marcar notificação.' }); }
});
module.exports = router;
