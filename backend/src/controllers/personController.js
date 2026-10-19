const { Op, fn, col } = require('sequelize');
const sequelize = require('../config/database');
const MissingPerson = require('../models/MissingPerson');
const Contact = require('../models/Contact');
const Location = require('../models/Location');
const OccurrenceLog = require('../models/OccurrenceLog');

// Campos que o usuário pode enviar
const CAMPOS_CRIACAO = [
  'nome', 'rg', 'data_nascimento', 'sexo', 'etnia', 'altura', 'peso',
  'contato', 'informacoes', 'locais_favoritos',
  'cidade', 'estado_desaparecimento', 'data_desaparecimento',
  'latitude', 'longitude', 'foto'
];
const CAMPOS_EDICAO = [...CAMPOS_CRIACAO, 'status'];

// Dados que NÃO aparecem publicamente
const ATRIBUTOS_PUBLICOS = {
  exclude: ['cpf_usuario', 'rg', 'contato', 'locais_favoritos']
};

const LIMITE_PADRAO = 60;
const LIMITE_MAXIMO = 100;

const INCLUDES_DETALHE = [
  { model: Contact, as: 'contatos', attributes: ['tipo', 'contato'] },
  {
    model: Location,
    as: 'localizacoes',
    attributes: ['endereco', 'cidade', 'estado', 'data_localizacao', 'observacao']
  }
];

// ---------- utilitários ----------
const texto = (valor, max) => (typeof valor === 'string' ? valor.trim().slice(0, max) : '');

const pegarCampos = (body, campos) => {
  const resultado = {};
  for (const campo of campos) {
    const v = body[campo];
    if (v !== undefined && v !== null && v !== '') resultado[campo] = v;
  }
  return resultado;
};

const dataValida = (valor) => {
  if (!valor) return null;
  const d = new Date(valor);
  return isNaN(d.getTime()) ? null : d;
};

const montarContatos = (body) => {
  const lista = [];
  if (Array.isArray(body.contatos)) {
    for (const c of body.contatos.slice(0, 5)) {
      const tipo = texto(c && c.tipo, 20);
      const valor = texto(c && c.contato, 100);
      if (tipo && valor) lista.push({ tipo, contato: valor });
    }
  }
  const simples = texto(body.contato, 100);
  if (simples) lista.push({ tipo: 'telefone', contato: simples });
  return lista;
};

const montarLocalizacoes = (body) => {
  const lista = [];
  if (Array.isArray(body.localizacoes)) {
    for (const l of body.localizacoes.slice(0, 10)) {
      const item = {
        endereco: texto(l && l.endereco, 200) || null,
        cidade: texto(l && l.cidade, 100) || null,
        estado: texto(l && l.estado, 50) || null,
        data_localizacao: dataValida(l && l.data_localizacao),
        observacao: texto(l && l.observacao, 1000) || null
      };
      if (Object.values(item).some(Boolean)) lista.push(item);
    }
  }
  const lugares = texto(body.ultimas_localizacoes, 500);
  if (lugares) lista.push({ observacao: lugares });
  return lista;
};

const naoEhDono = (person, req) => person.cpf_usuario !== req.userCpf;

// Não registrar valores de documentos, contato, fotos ou endereços pessoais em logs.
const CAMPOS_LOG = new Set([
  'nome', 'data_nascimento', 'sexo', 'etnia', 'altura', 'peso',
  'informacoes', 'cidade', 'estado_desaparecimento', 'data_desaparecimento', 'status'
]);
const CAMPOS_RESTRITOS = new Set(['rg', 'contato', 'foto', 'locais_favoritos']);
const normalizar = (valor) => valor == null ? null : String(valor);
const gerarAlteracoes = (antigo, novo) => {
  const alteracoes = {};
  for (const [campo, valor] of Object.entries(novo)) {
    if (normalizar(antigo[campo]) === normalizar(valor)) continue;
    if (CAMPOS_LOG.has(campo)) {
      alteracoes[campo] = { anterior: antigo[campo] ?? null, novo: valor };
    } else if (CAMPOS_RESTRITOS.has(campo)) {
      alteracoes[campo] = { alterado: true }; // sem dados sensíveis
    }
  }
  return alteracoes;
};

// ---------- minhas ocorrências (acesso autenticado) ----------
exports.findMine = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 100);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const people = await MissingPerson.findAll({
      where: { cpf_usuario: req.userCpf },
      attributes: { exclude: ['cpf_usuario', 'foto'] },
      order: [['id_desaparecido', 'DESC']], limit, offset
    });
    res.json(people);
  } catch (error) {
    console.error('Erro ao buscar minhas ocorrências:', error);
    res.status(500).json({ error: 'Erro ao buscar suas ocorrências' });
  }
};

// ---------- histórico (somente proprietário) ----------
exports.getLogs = async (req, res) => {
  try {
    const person = await MissingPerson.findByPk(req.params.id);
    if (!person) return res.status(404).json({ error: 'Ocorrência não encontrada' });
    if (naoEhDono(person, req)) return res.status(403).json({ error: 'Acesso negado ao histórico' });
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const logs = await OccurrenceLog.findAll({
      where: { id_desaparecido: person.id_desaparecido, cpf_usuario: req.userCpf },
      attributes: ['id', 'id_desaparecido', 'acao', 'alteracoes', 'criado_em'],
      order: [['criado_em', 'DESC'], ['id', 'DESC']], limit, offset
    });
    res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
};

// ---------- cadastrar ----------
exports.create = async (req, res) => {
  try {
    const person = await sequelize.transaction(async (t) => {
      const nova = await MissingPerson.create(
        { ...pegarCampos(req.body, CAMPOS_CRIACAO), cpf_usuario: req.userCpf },
        { transaction: t }
      );

      const contatos = montarContatos(req.body).map((c) => ({ ...c, id_desaparecido: nova.id_desaparecido }));
      if (contatos.length) await Contact.bulkCreate(contatos, { transaction: t });

      const localizacoes = montarLocalizacoes(req.body).map((l) => ({ ...l, id_desaparecido: nova.id_desaparecido }));
      if (localizacoes.length) await Location.bulkCreate(localizacoes, { transaction: t });

      await OccurrenceLog.create({
        id_desaparecido: nova.id_desaparecido,
        cpf_usuario: req.userCpf,
        acao: 'criacao',
        alteracoes: {}
      }, { transaction: t });
      return nova;
    });

    res.status(201).json({
      success: true,
      message: 'Pessoa cadastrada com sucesso',
      person: { id_desaparecido: person.id_desaparecido, nome: person.nome }
    });
  } catch (error) {
    console.error('Erro ao cadastrar pessoa:', error);
    res.status(500).json({ error: 'Erro ao cadastrar pessoa desaparecida' });
  }
};

// ---------- listar (home) ----------
exports.findAll = async (req, res) => {
  try {
    const { search, estado, sexo, idadeMin, idadeMax, startDate, endDate, status } = req.query;

    const where = { status: status === 'encontrado' ? 'encontrado' : 'desaparecido' };

    if (typeof search === 'string' && search.trim()) {
      const termo = `%${search.trim().slice(0, 100).replace(/[\\%_]/g, '\\$&')}%`;
      where[Op.or] = [
        { nome: { [Op.iLike]: termo } },
        { cidade: { [Op.iLike]: termo } },
        { estado_desaparecimento: { [Op.iLike]: termo } }
      ];
    }

    if (typeof estado === 'string' && estado) {
      where.estado_desaparecimento = estado;
    }

    if (typeof sexo === 'string' && sexo) {
      where.sexo = sexo;
    }

    // Filtro por idade
    const idadeMinNum = parseInt(idadeMin, 10);
    const idadeMaxNum = parseInt(idadeMax, 10);

    if (!isNaN(idadeMinNum) || !isNaN(idadeMaxNum)) {
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();

      if (!isNaN(idadeMaxNum)) {
        const dataNascMin = `${anoAtual - idadeMaxNum - 1}-12-31`;
        where.data_nascimento = { ...where.data_nascimento, [Op.gte]: dataNascMin };
      }
      if (!isNaN(idadeMinNum)) {
        const dataNascMax = `${anoAtual - idadeMinNum}-01-01`;
        where.data_nascimento = { ...where.data_nascimento, [Op.lte]: dataNascMax };
      }
    }

    const formatoData = /^\d{4}-\d{2}-\d{2}$/;
    if (formatoData.test(startDate) && formatoData.test(endDate)) {
      where.data_desaparecimento = { [Op.between]: [startDate, endDate] };
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || LIMITE_PADRAO, LIMITE_MAXIMO);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const people = await MissingPerson.findAll({
      where,
      attributes: ATRIBUTOS_PUBLICOS,
      order: [['data_desaparecimento', 'DESC'], ['id_desaparecido', 'DESC']],
      limit,
      offset
    });

    res.json(people);
  } catch (error) {
    console.error('Erro ao buscar pessoas:', error);
    res.status(500).json({ error: 'Erro ao buscar casos' });
  }
};

// ---------- detalhe ----------
exports.findOne = async (req, res) => {
  try {
    const person = await MissingPerson.findByPk(req.params.id, {
      attributes: ATRIBUTOS_PUBLICOS,
      include: INCLUDES_DETALHE
    });

    if (!person) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }
    res.json(person);
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes' });
  }
};

// ---------- editar ----------
exports.update = async (req, res) => {
  try {
    const resultado = await sequelize.transaction(async (t) => {
      const person = await MissingPerson.findByPk(req.params.id, {
        transaction: t, lock: t.LOCK.UPDATE
      });
      if (!person) return { status: 404, error: 'Pessoa não encontrada' };
      if (naoEhDono(person, req)) return { status: 403, error: 'Você só pode editar casos que você cadastrou' };

      const dados = pegarCampos(req.body, CAMPOS_EDICAO);
      const anterior = person.get({ plain: true });
      const alteracoes = gerarAlteracoes(anterior, dados);
      if (Object.keys(alteracoes).length === 0) {
        return { status: 200, body: { success: true, message: 'Nenhuma alteração identificada' } };
      }
      await person.update(dados, { transaction: t });
      await OccurrenceLog.create({
        id_desaparecido: person.id_desaparecido,
        cpf_usuario: req.userCpf,
        acao: 'edicao', alteracoes
      }, { transaction: t });
      return { status: 200, body: { success: true, person: {
        id_desaparecido: person.id_desaparecido, nome: person.nome, status: person.status
      } } };
    });
    if (resultado.error) return res.status(resultado.status).json({ error: resultado.error });
    res.status(resultado.status).json(resultado.body);
  } catch (error) {
    console.error('Erro ao atualizar:', error);
    res.status(500).json({ error: 'Erro ao atualizar' });
  }
};

// ---------- remover ----------
exports.delete = async (req, res) => {
  try {
    const person = await MissingPerson.findByPk(req.params.id);
    if (!person) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }
    if (naoEhDono(person, req)) {
      return res.status(403).json({ error: 'Você só pode remover casos que você cadastrou' });
    }

    await sequelize.transaction(async (t) => {
      const id_desaparecido = person.id_desaparecido;
      await Contact.destroy({ where: { id_desaparecido }, transaction: t });
      await Location.destroy({ where: { id_desaparecido }, transaction: t });
      await OccurrenceLog.create({
        id_desaparecido, cpf_usuario: req.userCpf, acao: 'exclusao', alteracoes: {}
      }, { transaction: t });
      await person.destroy({ transaction: t });
    });

    res.json({ success: true, message: 'Caso removido' });
  } catch (error) {
    console.error('Erro ao remover:', error);
    res.status(500).json({ error: 'Erro ao remover' });
  }
};

// ---------- estatísticas ----------
exports.getStats = async (req, res) => {
  try {
    const linhas = await MissingPerson.findAll({
      attributes: ['estado_desaparecimento', [fn('COUNT', col('id_desaparecido')), 'count']],
      where: { status: 'desaparecido' },
      group: ['estado_desaparecimento'],
      raw: true
    });

    const byState = linhas
      .map((l) => ({ estado: l.estado_desaparecimento, count: Number(l.count) }))
      .sort((a, b) => b.count - a.count);

    const total = byState.reduce((soma, l) => soma + l.count, 0);

    res.json({ total, byState });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};
