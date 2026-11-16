const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const MissingPerson = require('./MissingPerson');
const Report = sequelize.define('relato', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  id_desaparecido: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'desaparecido', key: 'id_desaparecido' } },
  tipo: { type: DataTypes.STRING(30), allowNull: false },
  descricao: { type: DataTypes.TEXT, allowNull: false },
  local_informado: { type: DataTypes.STRING(160) },
  data_avistamento: { type: DataTypes.DATEONLY },
  periodo: { type: DataTypes.STRING(20) },
  contato: { type: DataTypes.STRING(120) },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'recebido' },
  nota_admin: { type: DataTypes.TEXT },
  criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  atualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'relatos', timestamps: false });
Report.belongsTo(MissingPerson, { foreignKey: 'id_desaparecido', as: 'ocorrencia' });
module.exports = Report;
