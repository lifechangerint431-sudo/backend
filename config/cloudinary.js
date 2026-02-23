const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// ✅ FONCTION getPublicId ANCIENNE (PARFAITE)
const getPublicIdFromUrl = (url) => {
  try {
    console.log('🔍 EXTRACTING FROM:', url);
    const parts = url.split('/');
    const filename = parts[parts.length - 1]; 
    const publicId = filename.replace(/\.[^/.]+$/, "");

    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return publicId;

    let pathStart = uploadIndex + 1;
    if (parts[pathStart]?.startsWith('v') && !isNaN(parts[pathStart].slice(1))) {
      pathStart++;
    }

    const folder = parts[pathStart]; 
    const subfolder = parts[pathStart + 1];

    if (folder === 'mega_ecommerce' && subfolder === 'images') {
      const fullPublicId = `${folder}/${subfolder}/${publicId}`;
      console.log('✅ PUBLIC_ID CLOUDINARY:', fullPublicId);
      return fullPublicId;
    }

    console.log('✅ PUBLIC_ID SIMPLE:', publicId);
    return publicId;
  } catch (error) {
    console.error('❌ getPublicId ERROR:', error);
    return null;
  }
};

// ✅ SUPPRESSION ANCIENNE (PARFAITE)
const deleteCloudinaryFile = async (url, type = 'image') => {
  if (!url) return { success: false, message: "Pas d'URL" };
  
  const publicId = getPublicIdFromUrl(url);
  if (!publicId) return { success: false, message: 'Public ID invalide' };
  
  console.log(`🗑️ DELETE ${type.toUpperCase()}:`, publicId);
  
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: type === 'video' ? 'video' : 'image',
      invalidate: true
    });
    
    console.log(`✅ DELETE ${type.toUpperCase()}:`, result.result);
    return { success: true, result: result.result };
  } catch (error) {
    console.log(`⚠️ DELETE ÉCHOUÉ:`, error.message);
    return { success: false, error: error.message };
  }
};

// ✅ MULTER + TOUS FORMATS
const uploadsDir = 'uploads/temp';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + 
      path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp|jfif|bmp|tiff|svg|ico|heic|raw/i;
  const videoTypes = /mp4|avi|mov|wmv|flv|webm|mkv|mpeg|mpg/i;
  
  const isImage = imageTypes.test(file.mimetype) || imageTypes.test(file.originalname);
  const isVideo = videoTypes.test(file.mimetype) || videoTypes.test(file.originalname);
  
  if (isImage || isVideo) cb(null, true);
  else cb(null, false);
};

const uploadFiles = multer({ 
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB
  fileFilter
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'videoDemoFile', maxCount: 1 }
]);

// ✅ UPLOAD disque → Cloudinary (NOUVEAU)
const uploadToCloudinary = async (localFilePath, resourceType = 'image') => {
  try {
    if (!fs.existsSync(localFilePath)) {
      throw new Error('Fichier temporaire introuvable');
    }

    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: 'mega_ecommerce/images',
      resource_type: resourceType,
      quality: 'auto',
      fetch_format: 'auto',
      overwrite: true
    });
    
    fs.promises.unlink(localFilePath).catch(() => {});
    console.log(`✅ ${resourceType.toUpperCase()}:`, result.secure_url);
    return result.secure_url;
  } catch (error) {
    fs.promises.unlink(localFilePath).catch(() => {});
    throw new Error(`Cloudinary: ${error.message}`);
  }
};

module.exports = {
  cloudinary,
  uploadFiles,
  uploadToCloudinary,
  deleteCloudinaryFile,
  getPublicIdFromUrl
};
