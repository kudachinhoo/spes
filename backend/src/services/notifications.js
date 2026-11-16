const Notification = require('../models/Notification');
exports.notify = (person, tipo, mensagem, transaction) => Notification.create({
 cpf_usuario: person.cpf_usuario, id_desaparecido: person.id_desaparecido, tipo, mensagem
}, { transaction });
exports.fromLog = async (log, options) => {
 const person = await require('../models/MissingPerson').findByPk(log.id_desaparecido, { transaction: options.transaction });
 if (!person) return;
 const mensagens = { criacao: 'Ocorrência cadastrada.', edicao: 'Os dados da ocorrência foram atualizados.', exclusao: 'A ocorrência foi excluída.' };
 let mensagem = mensagens[log.acao];
 if (log.acao === 'edicao' && log.alteracoes && log.alteracoes.status) mensagem = 'A situação da ocorrência foi atualizada.';
 if (mensagem) await exports.notify(person, log.acao, mensagem, options.transaction);
};
