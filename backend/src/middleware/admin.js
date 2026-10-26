const User = require('../models/User');
module.exports = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userCpf, { attributes: ['cpf', 'papel'] });
    if (!user || user.papel !== 'admin') return res.status(403).json({ error: 'Acesso exclusivo de administradores' });
    req.isAdmin = true;
    next();
  } catch (err) { console.error('Erro ao verificar admin:', err); res.status(500).json({ error: 'Falha ao verificar permissões' }); }
};
