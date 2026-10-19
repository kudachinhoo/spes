const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Histórico independente: mantém registros mesmo se a ocorrência for removida.
const OccurrenceLog = sequelize.define('ocorrencia_log', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  id_desaparecido: { type: DataTypes.INTEGER, allowNull: false },
  cpf_usuario: { type: DataTypes.STRING(11), allowNull: false },
  acao: { type: DataTypes.STRING(20), allowNull: false },
  alteracoes: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'ocorrencia_logs', timestamps: false, indexes: [
  { fields: ['id_desaparecido', 'criado_em'] },
  { fields: ['cpf_usuario', 'criado_em'] }
] });

module.exports = OccurrenceLog;
