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
    references: { model: 'usuario', key: 'cpf' }
  },
  nome: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  rg: {
    type: DataTypes.STRING(20)
  },
  data_nascimento: {
    type: DataTypes.DATEONLY
  },
  sexo: {
    type: DataTypes.STRING(20)
  },
  etnia: {
    type: DataTypes.STRING(30)
  },
  altura: {
    type: DataTypes.DECIMAL(5, 2)
  },
  peso: {
    type: DataTypes.DECIMAL(5, 2)
  },
  contato: {
    type: DataTypes.STRING(20)
  },
  informacoes: {
    type: DataTypes.TEXT
  },
  locais_favoritos: {
    type: DataTypes.TEXT
  },
  cidade: {
    type: DataTypes.STRING(100)
  },
  estado_desaparecimento: {
    type: DataTypes.STRING(50)
  },
  data_desaparecimento: {
    type: DataTypes.DATEONLY
  },
  foto: {
    type: DataTypes.TEXT
  },
  fotos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'desaparecido',
    validate: { isIn: [['desaparecido', 'encontrado']] }
  }
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
