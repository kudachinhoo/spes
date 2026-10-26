const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const PasswordReset = sequelize.define('recuperacao_senha', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  cpf_usuario: { type: DataTypes.STRING(11), allowNull: false, references: { model: 'usuario', key: 'cpf' } },
  token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expira_em: { type: DataTypes.DATE, allowNull: false },
  utilizado_em: { type: DataTypes.DATE, allowNull: true },
  criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'recuperacao_senha', timestamps: false });

PasswordReset.belongsTo(User, { foreignKey: 'cpf_usuario' });
module.exports = PasswordReset;
