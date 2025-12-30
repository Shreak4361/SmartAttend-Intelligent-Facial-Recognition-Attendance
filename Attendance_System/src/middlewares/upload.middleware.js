const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

exports.uploadUserImages = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'attendance/users',
      allowed_formats: ['jpg', 'png']
    }
  })
});

exports.uploadGroupImage = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'attendance/groups',
      allowed_formats: ['jpg', 'png']
    }
  })
});
