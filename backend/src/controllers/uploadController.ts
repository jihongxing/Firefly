import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import path from 'path';

export class UploadController {
  /**
   * POST /api/upload/image
   */
  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError(400, 'No file uploaded', 'NO_FILE');
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      res.json({
        data: {
          url: fileUrl,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/upload/images
   */
  async uploadImages(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new AppError(400, 'No files uploaded', 'NO_FILES');
      }

      const files = req.files.map((file) => ({
        url: `/uploads/${file.filename}`,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      }));

      res.json({
        data: {
          files,
          count: files.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UploadController();
