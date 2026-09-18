const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// We need to load dotenv here in case this file is evaluated early or independently, 
// though typically it's done in app.js
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

const exifr = require('exifr');

const processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    // 1. Extract EXIF data
    const exifData = await exifr.parse(req.file.buffer);
    if (exifData && exifData.latitude && exifData.longitude) {
      req.exifLocation = {
        latitude: exifData.latitude,
        longitude: exifData.longitude
      };
    }

    // 2. Upload to Cloudinary using upload_stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'civicsense_complaints',
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return next(error);
        }
        // Attaching the cloudinary URL to req.file.path so controller works seamlessly
        req.file.path = result.secure_url;
        next();
      }
    );

    // Write buffer to stream
    uploadStream.end(req.file.buffer);

  } catch (error) {
    console.error("Image processing error:", error);
    next(error);
  }
};

module.exports = { upload, processImage };
