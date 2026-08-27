const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const personRoutes = require('./routes/personRoutes');

const app = express();

// Middlewares (AGORA ESTÁ AQUI!)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: '*', // Permite qualquer site
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/people', personRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SPES API funcionando!' });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('📦 Conexão com PostgreSQL estabelecida');
    
    // Sincroniza modelos (cria tabelas se não existirem)
    await sequelize.sync({ alter: true });
    console.log('📦 Tabelas sincronizadas');

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