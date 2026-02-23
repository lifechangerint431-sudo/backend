const jwt = require('jsonwebtoken');
const { SuperAdmin } = require('../models');

const authSuperAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Token requis' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const superAdmin = await SuperAdmin.findByPk(decoded.id, {
      attributes: ['id', 'nom', 'email', 'telephone', 'isActive']
    });

    if (!superAdmin || !superAdmin.isActive) {
      return res.status(401).json({ message: 'Super Admin non autorisé' });
    }

    req.superAdmin = superAdmin;
    next();
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    res.status(401).json({ message: 'Token invalide' });
  }
};

module.exports = { authSuperAdmin };
