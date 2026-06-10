import { Router } from 'express';
import healthRouter from './health';
import markersRouter from './markers';
import configRouter from './config';
import authRouter from './auth';
import uploadRouter from './upload';
import gamificationRouter from './gamification';
import adminRouter from './admin';
import communityRouter from './community';
import userMarkersRouter from './userMarkers';

const router = Router();

router.use('/', healthRouter);
router.use('/auth', authRouter);
router.use('/markers', markersRouter);
router.use('/upload', uploadRouter);
router.use('/users', userMarkersRouter);
router.use('/gamification', gamificationRouter);
router.use('/admin', adminRouter);
router.use('/community', communityRouter);
router.use('/', configRouter);

export default router;
