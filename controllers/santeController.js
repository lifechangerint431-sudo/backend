const { Sante, ProduitLongrich } = require('../models');
const { uploadToCloudinary, deleteCloudinaryFile } = require('../config/cloudinary');

const getAllSantes = async (req, res) => {
  try {
    const { page = 1, limit = 10, categorie, search, active } = req.query;
    
    const where = {};
    if (categorie && categorie !== 'toutes') where.categorie = categorie;
    if (search) where.probleme = { [Op.iLike]: `%${search}%` };
    if (active !== undefined) where.isActive = active === 'true';

    const offset = (page - 1) * limit;
    const { count, rows: santes } = await Sante.findAndCountAll({
      where,
      include: [{
        model: ProduitLongrich,
        as: 'monProduit',
        attributes: ['id', 'nom', 'photo']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['updatedAt'] }
    });

    res.json({
      success: true,
      santes,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(count / limit),
        total: count
      }
    });
  } catch (error) {
    console.error('❌ getAllSantes:', error);
    res.status(500).json({ success: false, message: 'Erreur récupération packs santé' });
  }
};

const getSanteById = async (req, res) => {
  try {
    const { id } = req.params;
    const sante = await Sante.findByPk(id, {
      include: [{
        model: ProduitLongrich,
        as: 'monProduit',
        attributes: ['id', 'nom', 'photo']
      }]
    });
    
    if (!sante) {
      return res.status(404).json({ success: false, message: 'Pack santé non trouvé' });
    }

    res.json({ success: true, sante });
  } catch (error) {
    console.error('❌ getSanteById:', error);
    res.status(500).json({ success: false, message: 'Erreur pack santé' });
  }
};

const createSante = async (req, res) => {
  try {
    let videoUrl = null;

    const videoFile = req.files?.videoDemoFile?.[0];
    if (videoFile) {
      videoUrl = await uploadToCloudinary(videoFile.path, 'video');
    }

    const sante = await Sante.create({
      categorie: req.body.categorie,
      probleme: req.body.probleme,
      packProduits: JSON.parse(req.body.packProduits || '[]'),
      consigneUtilisation: req.body.consigneUtilisation,
      videoDemo: videoUrl,
      produitId: req.body.produitId || null,
      isActive: true
    });

    res.status(201).json({ success: true, message: '✅ Pack santé créé !', sante });
  } catch (error) {
    console.error('❌ CREATE SANTÉ ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSante = async (req, res) => {
  try {
    const { id } = req.params;
    const sante = await Sante.findByPk(id);
    
    if (!sante) {
      return res.status(404).json({ success: false, message: 'Pack santé introuvable' });
    }

    // Supprimer ancienne vidéo si nouvelle
    const newVideo = req.files?.videoDemoFile?.[0];
    if (newVideo && sante.videoDemo) {
      await deleteCloudinaryFile(sante.videoDemo, 'video');
    }

    let videoUrl = sante.videoDemo;
    if (newVideo) {
      videoUrl = await uploadToCloudinary(newVideo.path, 'video');
    }

    await sante.update({
      categorie: req.body.categorie || sante.categorie,
      probleme: req.body.probleme || sante.probleme,
      packProduits: JSON.parse(req.body.packProduits || JSON.stringify(sante.packProduits)),
      consigneUtilisation: req.body.consigneUtilisation || sante.consigneUtilisation,
      videoDemo: videoUrl,
      produitId: req.body.produitId || sante.produitId
    });

    const updatedSante = await Sante.findByPk(id, {
      include: [{ model: ProduitLongrich, as: 'monProduit' }]
    });

    res.json({ 
      success: true, 
      message: '✅ Pack santé mis à jour !',
      sante: updatedSante 
    });

  } catch (error) {
    console.error('💥 UPDATE SANTÉ ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSante = async (req, res) => {
  try {
    const { id } = req.params;
    const sante = await Sante.findByPk(id);
    
    if (!sante) {
      return res.status(404).json({ success: false, message: 'Pack santé non trouvé' });
    }

    if (sante.videoDemo) {
      await deleteCloudinaryFile(sante.videoDemo, 'video');
    }

    await sante.destroy();
    
    res.json({ success: true, message: 'Pack santé supprimé avec succès' });
  } catch (error) {
    console.error('❌ deleteSante:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const sante = await Sante.findByPk(id);
    
    if (!sante) {
      return res.status(404).json({ success: false, message: 'Pack santé non trouvé' });
    }

    sante.isActive = !sante.isActive;
    await sante.save();

    res.json({
      success: true,
      message: `Pack santé ${sante.isActive ? 'activé' : 'désactivé'}`,
      isActive: sante.isActive
    });
  } catch (error) {
    console.error('❌ toggleStatus Sante:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllSantes,
  getSanteById,
  createSante,
  updateSante,
  deleteSante,
  toggleStatus
};
