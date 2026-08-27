const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Case = sequelize.define('Case', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  personId: {
    type: DataTypes.UUID,
    references: {
      model: 'MissingPeople',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('ativo', 'resolvido', 'arquivado'),
    defaultValue: 'ativo'
  },
  lastUpdate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  notes: {
    type: DataTypes.TEXT
  },
  updatedBy: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
});

module.exports = Case;