const MissingPerson = require('../models/MissingPerson');
const Contact = require('../models/Contact');
const Location = require('../models/Location');
const { Op } = require('sequelize');

exports.create = async (req, res) => {
  try {
    const personData = {
      ...req.body,
      cpf_usuario: req.userCpf
    };

    const person = await MissingPerson.create(personData);

    // Se tiver contatos, adiciona
    if (req.body.contatos) {
      const contatos = req.body.contatos.map(c => ({
        ...c,
        id_desaparecido: person.id_desaparecido
      }));
      await Contact.bulkCreate(contatos);
    }

    // Se tiver localizações, adiciona
    if (req.body.localizacoes) {
      const localizacoes = req.body.localizacoes.map(l => ({
        ...l,
        id_desaparecido: person.id_desaparecido
      }));
      await Location.bulkCreate(localizacoes);
    }

    res.status(201).json({
      success: true,
      message: 'Pessoa cadastrada com sucesso',
      person
    });
  } catch (error) {
    console.error('Erro ao cadastrar pessoa:', error);
    res.status(500).json({ error: 'Erro ao cadastrar pessoa desaparecida' });
  }
};

exports.findAll = async (req, res) => {
  try {
    const { search, estado, startDate, endDate } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { nome: { [Op.like]: `%${search}%` } },
        { informacoes: { [Op.like]: `%${search}%` } }
      ];
    }

    if (estado) {
      where.estado_desaparecimento = estado;
    }

    if (startDate && endDate) {
      where.data_desaparecimento = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const people = await MissingPerson.findAll({
      where,
      order: [['data_desaparecimento', 'DESC']],
      include: [
        { 
          model: Contact, 
          as: 'contatos',
          attributes: ['tipo', 'contato']
        },
        {
          model: Location,
          as: 'localizacoes',
          attributes: ['endereco', 'cidade', 'estado', 'data_localizacao', 'observacao']
        }
      ]
    });

    res.json(people);
  } catch (error) {
    console.error('Erro ao buscar pessoas:', error);
    res.status(500).json({ error: 'Erro ao buscar casos' });
  }
};

exports.findOne = async (req, res) => {
  try {
    const person = await MissingPerson.findByPk(req.params.id, {
      include: [
        { 
          model: Contact, 
          as: 'contatos',
          attributes: ['tipo', 'contato']
        },
        {
          model: Location,
          as: 'localizacoes',
          attributes: ['endereco', 'cidade', 'estado', 'data_localizacao', 'observacao']
        }
      ]
    });
    
    if (!person) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar detalhes' });
  }
};

exports.update = async (req, res) => {
  try {
    const person = await MissingPerson.findByPk(req.params.id);
    if (!person) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    await person.update(req.body);
    res.json({ success: true, person });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar' });
  }
};

exports.delete = async (req, res) => {
  try {
    const person = await MissingPerson.findByPk(req.params.id);
    if (!person) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    await person.destroy();
    res.json({ success: true, message: 'Caso removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover' });
  }
};

// Estatísticas
exports.getStats = async (req, res) => {
  try {
    const total = await MissingPerson.count();
    
    // Contar por estado
    const [byState] = await MissingPerson.sequelize.query(
      'SELECT estado_desaparecimento as estado, COUNT(*) as count FROM desaparecido GROUP BY estado_desaparecimento ORDER BY count DESC'
    );

    res.json({
      total,
      byState
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};