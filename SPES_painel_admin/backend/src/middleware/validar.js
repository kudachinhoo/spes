const { validationResult } = require('express-validator');

// Para usar depois das regras do express-validator:
// devolve { errors: [{ msg, path, ... }] } com status 400 se algo estiver inválido.
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
