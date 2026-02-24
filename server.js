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
// Note: Assure-toi que l'import de sequelize ici ne lance pas de sync automatique
const { sequelize } = require('./models');

const app = express();
const server = http.createServer(app);

// --- CONFIGURATION DES ORIGINES AUTORISÉES ---
const allowedOrigins = [
  process.env.FRONTEND_LOCAL_URL,
  process.env.FRONTEND_VERCEL_URL
].filter(Boolean).map(url => url.replace(/\/$/, "")); // Supprime le slash final s'il existe

// --- CONFIGURATION SOCKET.IO ---
const io = socketIo(server, {
  cors: { 
    origin: allowedOrigins, 
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// --- MIDDLEWARES DE SÉCURITÉ ET BASE ---

// Debug log pour voir les requêtes arrivées sur Railway
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - Origin: ${req.get('origin')}`);
  next();
});

// Configuration Helmet améliorée (pour ne pas bloquer les requêtes cross-origin)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configuration CORS Robuste
app.use(cors({
  origin: function (origin, callback) {
    // Autorise les requêtes sans origine (comme Postman ou les appels système internes)
    if (!origin) return callback(null, true);
    
    // On nettoie l'origine entrante pour la comparaison (enlever le slash final)
    const cleanOrigin = origin.replace(/\/$/, "");
    
    if (allowedOrigins.includes(cleanOrigin)) {
      callback(null, true);
    } else {
      console.log("❌ CORS Bloqué pour l'origine:", origin);
      callback(new Error('Non autorisé par CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- LIMITATION DE DÉBIT (RATE LIMIT) ---
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { message: "Trop de requêtes, veuillez réessayer plus tard." }
});
app.use('/api', limiter);

// --- ROUTES ---

// Montage des routes Super Admin
app.use('/api/super-admin', superAdminRoutes);

// Route de test pour vérifier que le backend répond
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'Backend en ligne !', 
    env: process.env.NODE_ENV,
    timestamp: new Date() 
  });
});

// Gestion des routes inexistantes (404)
app.use('*', (req, res) => {
  console.log(`⚠️ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route non trouvée sur le serveur' });
});

// --- DÉMARRAGE DU SERVEUR ---

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connexion à la base de données (Postgres sur Railway / MySQL en local)
    await connect();
    console.log('✅ Base de données connectée avec succès');
    
    server.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`🌍 Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Origins autorisées: ${allowedOrigins.join(', ')}`);
    });
  } catch (error) {
    console.error('❌ Impossible de démarrer le serveur:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = { app, io };