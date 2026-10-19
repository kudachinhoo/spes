const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const personRoutes = require('./routes/personRoutes');
const caseRoutes = require('./routes/caseRoutes');
require('./models/OccurrenceLog'); // registra a tabela de auditoria no Sequelize

const app = express();

// No Render o app fica atrás de um proxy. Sem isto o rate limit enxerga o IP do
// proxy (o mesmo para todo mundo) e todos os visitantes dividem o mesmo limite.
app.set('trust proxy', 1);

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: '*', // Permite qualquer site (quando o site tiver domínio fixo, troque pelo endereço dele)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check fica ANTES do rate limit (o Render chama com frequência)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SPES API funcionando!' });
});

// Rate limiting geral (login/cadastro têm um limite mais apertado em authRoutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
});
app.use('/api', limiter);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/people', personRoutes);
app.use('/api/cases', caseRoutes);

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Erros (JSON inválido, foto grande demais, etc.) sempre em JSON
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Os dados enviados são grandes demais. Tente uma foto menor.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('📦 Conexão com PostgreSQL estabelecida');

    // sync() cria tabelas que faltam. O "alter" também ajusta/adiciona colunas, mas é
    // lento e arriscado, então só roda quando DB_SYNC_ALTER=true (ligue uma vez
    // quando mudar os modelos e desligue depois). Isso também acelera o "acordar" do Render.
    const alterar = process.env.DB_SYNC_ALTER === 'true';
    await sequelize.sync(alterar ? { alter: true } : {});
    console.log(`📦 Tabelas sincronizadas${alterar ? ' (com alter)' : ''}`);

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
