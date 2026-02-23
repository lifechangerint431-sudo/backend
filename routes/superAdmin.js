const express = require('express');
const { registerSuperAdmin, loginSuperAdmin } = require('../controllers/superAdminController');
const { authSuperAdmin } = require('../middleware/auth');
const { 
  getAllProduits, getProduitById, createProduit, updateProduit, 
  deleteProduit, toggleStatus 
} = require('../controllers/produitLongrichController');
const { uploadFiles } = require('../config/cloudinary'); // ✅ uploadFiles
const models = require('../models');

const router = express.Router();

router.post('/register/super-admin-register-secret', registerSuperAdmin);
router.post('/login', loginSuperAdmin);

router.get('/profile', authSuperAdmin, (req, res) => {
  res.json({ superAdmin: req.superAdmin, message: 'Profil récupéré' });
});

// 🔥 PRODUITS - FIXED
router.get('/produits', authSuperAdmin, getAllProduits);
router.get('/produits/:id', authSuperAdmin, getProduitById);
router.post('/produits', authSuperAdmin, uploadFiles, createProduit);     // ✅ OK
router.put('/produits/:id', authSuperAdmin, uploadFiles, updateProduit);
router.delete('/produits/:id', authSuperAdmin, deleteProduit);
router.patch('/produits/:id/toggle', authSuperAdmin, toggleStatus);

// Stats
router.get('/stats', authSuperAdmin, async (req, res) => {
  try {
    const { ProduitLongrich, Boutique, Commande, Livraison } = models;
    const stats = {
      produits: await ProduitLongrich.count({ where: { isActive: true } }) || 0,
      boutiques: await Boutique?.count({ where: { isActive: true } }) || 0,
      commandes: await Commande?.count() || 0,
      livraisons: await Livraison?.count() || 0,
      revenus: (await Commande?.sum('prixTotal')) || 0
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ fallback: { produits: 0, boutiques: 0, commandes: 0, livraisons: 0, revenus: 0 } });
  }
});

module.exports = router;
