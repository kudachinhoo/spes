const { fn, col } = require('sequelize');
const MissingPerson = require('../models/MissingPerson');

// Antes este arquivo usava o modelo Case e colunas que não existem
// (state, missingSince, tabela "MissingPeople"). O status do caso agora
// fica direto na pessoa (coluna "status": desaparecido | encontrado).

exports.getAllStates = async (req, res) => {
  try {
    const linhas = await MissingPerson.findAll({
      attributes: ['estado_desaparecimento', [fn('COUNT', col('id_desaparecido')), 'count']],
      where: { status: 'desaparecido' },
      group: ['estado_desaparecimento'],
      raw: true
    });

    const resultado = linhas
      .map((l) => ({ state: l.estado_desaparecimento, count: Number(l.count) }))
      .sort((a, b) => String(a.state).localeCompare(String(b.state), 'pt-BR'));

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao buscar estados:', error);
    res.status(500).json({ error: 'Erro ao buscar estados' });
  }
};

exports.getCasesByState = async (req, res) => {
  try {
    const cases = await MissingPerson.findAll({
      where: {
        estado_desaparecimento: req.params.state,
        status: 'desaparecido'
      },
      attributes: { exclude: ['cpf_usuario'] },
      order: [['data_desaparecimento', 'DESC'], ['id_desaparecido', 'DESC']],
      limit: 100
    });
    res.json(cases);
  } catch (error) {
    console.error('Erro ao buscar casos do estado:', error);
    res.status(500).json({ error: 'Erro ao buscar casos do estado' });
  }
};

exports.updateCaseStatus = async (req, res) => {
  try {
    const person = await MissingPerson.findByPk(req.params.id);
    if (!person) {
      return res.status(404).json({ error: 'Caso não encontrado' });
    }
    if (person.cpf_usuario !== req.userCpf) {
      return res.status(403).json({ error: 'Você só pode alterar casos que você cadastrou' });
    }

    await person.update({
      status: req.body.status === 'encontrado' ? 'encontrado' : 'desaparecido'
    });

    res.json({ success: true, message: 'Status atualizado', status: person.status });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
};
