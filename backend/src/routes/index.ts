import { Router } from 'express';
import healthRouter from './health';
import markersRouter from './markers';
import configRouter from './config';

const router = Router();

router.use('/', healthRouter);
router.use('/markers', markersRouter);
router.use('/', configRouter);

export default router;
