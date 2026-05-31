import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { env } from '../config/env';
import uploadController from '../controllers/uploadController';
import { authMiddleware } from '../middleware/auth';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'marker-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只支持图片文件 (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(env.MAX_FILE_SIZE), // 10MB default
  },
  fileFilter: fileFilter,
});

const router = Router();

// Upload single image
router.post('/image', authMiddleware, upload.single('image'), uploadController.uploadImage.bind(uploadController));

// Upload multiple images
router.post('/images', authMiddleware, upload.array('images', 5), uploadController.uploadImages.bind(uploadController));

export default router;
