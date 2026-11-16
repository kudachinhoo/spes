const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
module.exports = sequelize.define('notificacao', {
 id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
 cpf_usuario: { type: DataTypes.STRING(11), allowNull: false },
 id_desaparecido: { type: DataTypes.INTEGER, allowNull: false },
 tipo: { type: DataTypes.STRING(40), allowNull: false },
 mensagem: { type: DataTypes.STRING(240), allowNull: false },
 lida_em: { type: DataTypes.DATE, allowNull: true },
 criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'notificacoes', timestamps: false, indexes: [
 { fields: ['cpf_usuario', 'lida_em', 'criado_em'] }
] });
