const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const MissingPerson = require('./MissingPerson');

const Contact = sequelize.define('contato', {
  id_contato: {
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
  tipo: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  contato: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  tableName: 'contato',
  timestamps: false
});

Contact.belongsTo(MissingPerson, {
  foreignKey: 'id_desaparecido',
  as: 'desaparecido'
});

MissingPerson.hasMany(Contact, {
  foreignKey: 'id_desaparecido',
  as: 'contatos'
});

module.exports = Contact;