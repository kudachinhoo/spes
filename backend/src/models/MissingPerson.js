const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const MissingPerson = sequelize.define('desaparecido', {
  id_desaparecido: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  cpf_usuario: {
    type: DataTypes.STRING(11),
    allowNull: false,
    references: {
      model: 'usuario',
      key: 'cpf'
    }
  },
  // ... (outros campos mantidos)
}, {
  tableName: 'desaparecido',
  timestamps: false
});

MissingPerson.belongsTo(User, {
  foreignKey: 'cpf_usuario',
  targetKey: 'cpf',
  as: 'usuario'
});

module.exports = MissingPerson;