const User = require('../models/User');
module.exports = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userCpf, { attributes: ['papel'] });
    if (!user) return res.status(401).json({ error: 'Conta não encontrada' });
    req.isAdmin = user.papel === 'admin';
    next();
  } catch (err) { next(err); }
};
