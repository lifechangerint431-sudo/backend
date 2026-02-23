require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const { connect } = require('./config/database');
const superAdminRoutes = require('./routes/superAdmin');
const { sequelize } = require('./models');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { 
    origin: [process.env.FRONTEND_LOCAL_URL, process.env.FRONTEND_VERCEL_URL], 
    methods: ['GET', 'POST'] 
  }
});

// 🔍 MIDDLEWARE DEBUG (TEMPORAIRE)
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Middleware
app.use(helmet());
app.use(cors({ origin: [process.env.FRONTEND_LOCAL_URL, process.env.FRONTEND_VERCEL_URL] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(process.env.RATE_LIMIT_MAX)
});
app.use('/api', limiter);

// ✅ ROUTES (AVANT sync DB)
app.use('/api/super-admin', superAdminRoutes);

// Test route SIMPLE
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend OK !', timestamp: new Date() });
});

// 404 Handler
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route non trouvée' });
});

const PORT = process.env.PORT || 5000;

// Démarrage serveur
const startServer = async () => {
  try {
    await connect();
    console.log('✅ DB connectée');
    
    server.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur PORT ${PORT}`);
      console.log('📡 Test: http://localhost:5000/api/test');
      console.log('✅ Routes prêtes !');
    });
  } catch (error) {
    console.error('❌ Erreur démarrage:', error);
    process.exit(1);
  }
};

// SUPPRIME sequelize.sync() qui bloque !
startServer();

module.exports = { app, io };
