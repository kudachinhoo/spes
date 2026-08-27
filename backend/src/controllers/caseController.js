const Case = require('../models/Case');
const MissingPerson = require('../models/MissingPerson');
const { Op } = require('sequelize');

exports.getCasesByState = async (req, res) => {
  try {
    const { state } = req.params;
    const cases = await MissingPerson.findAll({
      where: {
        state,
        status: 'desaparecido'
      },
      order: [['missingSince', 'DESC']]
    });
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar casos do estado' });
  }
};

exports.getAllStates = async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const [results] = await sequelize.query(`
      SELECT state, COUNT(*) as count 
      FROM "MissingPeople" 
      WHERE status = 'desaparecido'
      GROUP BY state 
      ORDER BY state
    `);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estados' });
  }
};

exports.updateCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const caseRecord = await Case.findOne({ where: { personId: id } });
    if (!caseRecord) {
      return res.status(404).json({ error: 'Caso não encontrado' });
    }

    await caseRecord.update({ 
      status: status === 'encontrado' ? 'resolvido' : 'ativo',
      notes: notes || caseRecord.notes,
      updatedBy: req.userId,
      lastUpdate: new Date()
    });

    await MissingPerson.update(
      { status: status === 'encontrado' ? 'encontrado' : 'desaparecido' },
      { where: { id } }
    );

    res.json({ success: true, message: 'Status atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
};