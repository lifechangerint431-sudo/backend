const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { SuperAdmin } = require('../models');

const registerSuperAdmin = async (req, res) => {
  try {
    console.log('📥 Register appelé:', req.body); // DEBUG
    
    const { nom, email, password, telephone } = req.body;

    if (!nom || !email || !password) {
      return res.status(400).json({ message: 'Nom, email et mot de passe requis' });
    }

    const existingAdmin = await SuperAdmin.findOne({ where: { email } });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Super Admin existe déjà' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const superAdmin = await SuperAdmin.create({
      nom,
      email,
      password: hashedPassword,
      telephone: telephone || null
    });

    const token = jwt.sign(
      { id: superAdmin.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    console.log('✅ Super Admin créé:', superAdmin.email); // DEBUG
    
    res.status(201).json({
      message: 'Super Admin créé avec succès',
      token,
      superAdmin: {
        id: superAdmin.id,
        nom: superAdmin.nom,
        email: superAdmin.email,
        telephone: superAdmin.telephone
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ message: 'Erreur création', error: error.message });
  }
};

const loginSuperAdmin = async (req, res) => {
  try {
    console.log('🔐 Login appelé:', req.body.email); // DEBUG
    
    const { email, password } = req.body;
    const superAdmin = await SuperAdmin.findOne({ where: { email } });

    if (!superAdmin || !superAdmin.isActive) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const isMatch = await bcrypt.compare(password, superAdmin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    await superAdmin.update({ lastLogin: new Date() });
    const token = jwt.sign(
      { id: superAdmin.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    console.log('✅ Login réussi:', superAdmin.email); // DEBUG

    res.json({
      message: 'Connexion réussie',
      token,
      superAdmin: {
        id: superAdmin.id,
        nom: superAdmin.nom,
        email: superAdmin.email
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Erreur login', error: error.message });
  }
};

module.exports = { registerSuperAdmin, loginSuperAdmin };
