const { Sequelize } = require('sequelize');
require('dotenv').config();

// On déclare la variable sans lui donner de valeur fixe immédiatement
let sequelize;

// On vérifie d'abord si on est en ligne (Railway ou Render)
const databaseUrl = process.env.DATABASE_URL || process.env.RENDER_DB_URL;

if (databaseUrl && !databaseUrl.startsWith('#')) {
  // CONFIGURATION POSTGRES (Production)
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: { 
        require: true,
        rejectUnauthorized: false 
      }
    },
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  });
} else {
  // CONFIGURATION MYSQL (Local)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development',
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
    }
  );
}

const connect = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données');
    return sequelize;
  } catch (error) {
    console.error('❌ Erreur connexion DB:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  connect
};