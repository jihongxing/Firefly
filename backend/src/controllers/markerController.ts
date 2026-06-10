import { Request, Response, NextFunction } from 'express';
import markerService from '../services/markerService';
import { type AuthRequest } from '../middleware/auth';
import { GetMarkersQuerySchema, SubmitMarkerSchema } from '../types/marker';
import { AppError } from '../middleware/errorHandler';
import { generateFingerprint } from '../utils/geo';

export class MarkerController {
  /**
   * GET /api/markers
   */
  async getMarkers(req: Request, res: Response, next: NextFunction) {
    try {
      const query = GetMarkersQuerySchema.parse(req.query);
      const result = await markerService.getMarkers(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/markers/:id
   */
  async getMarkerById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new AppError(400, 'Invalid marker ID', 'INVALID_PARAMS');
      }

      const lang = (req.query.lang as string) || 'zh-CN';
      const marker = await markerService.getMarkerById(id, lang);

      if (!marker) {
        throw new AppError(404, 'Marker not found', 'NOT_FOUND');
      }

      res.json({ data: marker });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/markers/submit
   */
  async submitMarker(req: Request, res: Response, next: NextFunction) {
    try {
      const data = SubmitMarkerSchema.parse(req.body);

      const fingerprint = generateFingerprint(
        req.ip || '127.0.0.1',
        req.get('user-agent') || 'unknown'
      );

      const userId = (req as AuthRequest).user?.userId;

      const result = await markerService.submitMarker({
        ...data,
        fingerprint,
        ipAddress: req.ip || '127.0.0.1',
        userId,
      });

      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}

export default new MarkerController();
