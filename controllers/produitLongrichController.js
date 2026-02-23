const { ProduitLongrich, Op } = require('../models'); // ✅ Op manquant
const { uploadToCloudinary, deleteCloudinaryFile } = require('../config/cloudinary');

// ✅ 1️⃣ TOUTES FONCTIONS DÉCLARÉES AVANT exports
const getAllProduits = async (req, res) => {
  try {
    const { page = 1, limit = 10, categorie, search, active } = req.query;
    
    const where = {};
    if (categorie && categorie !== 'toutes') where.categorie = categorie;
    if (search) where.nom = { [Op.iLike]: `%${search}%` };
    if (active !== undefined) where.isActive = active === 'true';

    const offset = (page - 1) * limit;
    const { count, rows: produits } = await ProduitLongrich.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['updatedAt'] }
    });

    res.json({
      success: true,
      produits,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(count / limit),
        total: count
      }
    });
  } catch (error) {
    console.error('❌ getAllProduits:', error);
    res.status(500).json({ success: false, message: 'Erreur récupération produits' });
  }
};

const getProduitById = async (req, res) => {
  try {
    const { id } = req.params;
    const produit = await ProduitLongrich.findByPk(id);
    
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    res.json({ success: true, produit });
  } catch (error) {
    console.error('❌ getProduitById:', error);
    res.status(500).json({ success: false, message: 'Erreur produit' });
  }
};

const createProduit = async (req, res) => {
  try {
    let photoUrl = null;
    let videoUrl = null;

    const photoFile = req.files?.photo?.[0];
    const videoFile = req.files?.videoDemoFile?.[0];

    if (photoFile) {
      photoUrl = await uploadToCloudinary(photoFile.path, 'image');
    }
    if (videoFile) {
      videoUrl = await uploadToCloudinary(videoFile.path, 'video');
    }

    const produit = await ProduitLongrich.create({
      nom: req.body.nom,
      pv: parseFloat(req.body.pv),
      consignePromo: req.body.consignePromo || null,
      prixPartenaire: parseFloat(req.body.prixPartenaire || 0),
      prixClient: parseFloat(req.body.prixClient),
      prixPromo: req.body.prixPromo ? parseFloat(req.body.prixPromo) : null,
      promoActive: req.body.promoActive === 'true' || req.body.promoActive === true,
      categorie: req.body.categorie,
      description: req.body.description,
      modeEmploi: req.body.modeEmploi || null,
      photo: photoUrl,
      videoDemo: videoUrl,
      isActive: true
    });

    res.status(201).json({ success: true, message: '✅ Produit créé !', produit });
  } catch (error) {
    console.error('❌ CREATE ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProduit = async (req, res) => {
  try {
    const { id } = req.params;
    const produit = await ProduitLongrich.findByPk(id);
    
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    }

    console.log('\n🚨=== UPDATE', produit.nom, '===');
    console.log('📥 FICHIERS:', req.files);

    // ✅ SUPPRIMER ANCIENNES
    const deleteResults = { photo: null, video: null };

    const newPhoto = req.files?.photo?.[0];
    const newVideo = req.files?.videoDemoFile?.[0];
    
    if (newPhoto && produit.photo) {
      console.log('\n🗑️ SUPPR ANCIENNE PHOTO:');
      deleteResults.photo = await deleteCloudinaryFile(produit.photo, 'image');
    }
    
    if (newVideo && produit.videoDemo) {
      console.log('\n🗑️ SUPPR ANCIENNE VIDÉO:');
      deleteResults.video = await deleteCloudinaryFile(produit.videoDemo, 'video');
    }

    // ✅ NOUVELLES URLS
    let photoUrl = produit.photo;
    let videoUrl = produit.videoDemo;
    
    if (newPhoto) {
      console.log('\n🖼️ ➤ NOUVELLE PHOTO');
      photoUrl = await uploadToCloudinary(newPhoto.path, 'image');
    }
    
    if (newVideo) {
      console.log('\n🎥 ➤ NOUVELLE VIDÉO');
      videoUrl = await uploadToCloudinary(newVideo.path, 'video');
    }

    // ✅ UPDATE DB
    await produit.update({
      nom: req.body.nom || produit.nom,
      pv: parseFloat(req.body.pv || produit.pv),
      consignePromo: req.body.consignePromo || produit.consignePromo,
      prixPartenaire: parseFloat(req.body.prixPartenaire || produit.prixPartenaire),
      prixClient: parseFloat(req.body.prixClient || produit.prixClient),
      prixPromo: req.body.prixPromo ? parseFloat(req.body.prixPromo) : produit.prixPromo,
      promoActive: req.body.promoActive === 'true' || req.body.promoActive === true,
      categorie: req.body.categorie || produit.categorie,
      description: req.body.description || produit.description,
      modeEmploi: req.body.modeEmploi || produit.modeEmploi,
      photo: photoUrl,
      videoDemo: videoUrl
    });

    const updatedProduit = await ProduitLongrich.findByPk(id);

    console.log('\n✅=== RÉSULTAT FINAL ===');
    console.log('Cloudinary:', deleteResults);
    console.log('DB Photo:', updatedProduit.photo);

    res.json({ 
      success: true, 
      message: '✏️ Produit modifié ! Anciennes images supprimées ✅',
      produit: updatedProduit,
      debug: deleteResults 
    });

  } catch (error) {
    console.error('💥 UPDATE ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteProduit = async (req, res) => {
  try {
    const { id } = req.params;
    const produit = await ProduitLongrich.findByPk(id);
    
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    if (produit.photo) {
      const deleteResult = await deleteCloudinaryFile(produit.photo);
      console.log('🗑️ Image supprimée:', deleteResult);
    }
    if (produit.videoDemo) {
      const deleteResult = await deleteCloudinaryFile(produit.videoDemo, 'video');
      console.log('🗑️ Vidéo supprimée:', deleteResult);
    }

    await produit.destroy();
    
    res.json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ deleteProduit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const produit = await ProduitLongrich.findByPk(id);
    
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    produit.isActive = !produit.isActive;
    await produit.save();

    res.json({
      success: true,
      message: `Produit ${produit.isActive ? 'activé' : 'désactivé'}`,
      isActive: produit.isActive
    });
  } catch (error) {
    console.error('❌ toggleStatus:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 2️⃣ EXPORTS APRÈS TOUTES FONCTIONS
module.exports = {
  getAllProduits,
  getProduitById,
  createProduit,
  updateProduit,
  deleteProduit,
  toggleStatus
};
