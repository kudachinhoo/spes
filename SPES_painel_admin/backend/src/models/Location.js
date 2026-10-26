const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const MissingPerson = require('./MissingPerson');

const Location = sequelize.define('localizacao', {
  id_localizacao: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  id_desaparecido: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'desaparecido',
      key: 'id_desaparecido'
    }
  },
  endereco: {
    type: DataTypes.STRING(200)
  },
  cidade: {
    type: DataTypes.STRING(100)
  },
  estado: {
    type: DataTypes.STRING(50)
  },
  data_localizacao: {
    type: DataTypes.DATE
  },
  observacao: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'localizacao',
  timestamps: false
});

Location.belongsTo(MissingPerson, {
  foreignKey: 'id_desaparecido',
  as: 'desaparecido'
});

MissingPerson.hasMany(Location, {
  foreignKey: 'id_desaparecido',
  as: 'localizacoes'
});

module.exports = Location;