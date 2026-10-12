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
  nome: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  data_nascimento: {
    type: DataTypes.DATEONLY
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
  cidade_desaparecimento: {
    type: DataTypes.STRING(100)
  },
  estado_desaparecimento: {
    type: DataTypes.STRING(50)
  },
  data_desaparecimento: {
    type: DataTypes.DATEONLY
  },
  // Imagem em base64 (data:image/jpeg;base64,...)
  foto: {
    type: DataTypes.TEXT
  },
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
