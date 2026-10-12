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
  // As colunas abaixo usam os mesmos nomes que o formulário do site envia.
  // nome, estado_desaparecimento e data_desaparecimento são obrigatórios,
  // mas essa regra fica nas validações da rota (personRoutes) para que o
  // sync({ alter: true }) consiga adicionar as colunas em tabelas que já têm linhas.
  nome: {
    type: DataTypes.STRING(150)
  },
  data_nascimento: {
    type: DataTypes.DATEONLY
  },
  etnia: {
    type: DataTypes.STRING(20)
  },
  altura: {
    type: DataTypes.DECIMAL(5, 1)
  },
  peso: {
    type: DataTypes.DECIMAL(5, 1)
  },
  informacoes: {
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
  // Imagem em base64 (data:image/jpeg;base64,...) já reduzida pelo navegador
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
