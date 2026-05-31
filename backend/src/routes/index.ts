import { Router } from 'express';
import healthRouter from './health';
import markersRouter from './markers';
import configRouter from './config';
import authRouter from './auth';
import uploadRouter from './upload';
import usersRouter from './users';

const router = Router();

router.use('/', healthRouter);
router.use('/auth', authRouter);
router.use('/markers', markersRouter);
router.use('/upload', uploadRouter);
router.use('/users', usersRouter);
router.use('/', configRouter);

export default router;
