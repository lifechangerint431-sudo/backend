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
// On importe sequelize et les modèles pour la synchronisation
const { sequelize } = require('./models');

const app = express();

// ✅ INDISPENSABLE SUR RAILWAY : Faire confiance au proxy pour le Rate Limit
app.set('trust proxy', 1);

const server = http.createServer(app);

// --- CONFIGURATION DES ORIGINES AUTORISÉES ---
const allowedOrigins = [
  process.env.FRONTEND_LOCAL_URL,
  process.env.FRONTEND_VERCEL_URL
].filter(Boolean).map(url => url.replace(/\/$/, ""));

// --- CONFIGURATION SOCKET.IO ---
const io = socketIo(server, {
  cors: { 
    origin: allowedOrigins, 
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// --- MIDDLEWARES DE SÉCURITÉ ET BASE ---

// Debug log pour Railway
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - Origin: ${req.get('origin')}`);
  next();
});

// Configuration Helmet (autorise les ressources partagées)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configuration CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
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
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requêtes, veuillez réessayer plus tard." }
});
app.use('/api', limiter);

// --- ROUTES ---
app.use('/api/super-admin', superAdminRoutes);

app.get('/api/test', (req, res) => {
  res.json({ status: 'success', message: 'Backend opérationnel !' });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// --- DÉMARRAGE DU SERVEUR ---
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connexion physique à la base de données
    await connect();
    console.log('✅ Base de données connectée');
    
    // 2. Synchronisation des modèles (CRÉATION DES TABLES)
    // alter: true permet de mettre à jour les tables sans les supprimer si vous changez vos modèles
    await sequelize.sync({ alter: true });
    console.log('✅ Toutes les tables ont été synchronisées (super_admins, produits, etc.)');

    server.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`🌍 Mode: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Erreur critique au démarrage:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = { app, io };