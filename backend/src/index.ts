import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { globalRateLimit } from './middleware/rateLimit';
import prisma from './config/database';
import routes from './routes';

const app: Application = express();
const PORT = parseInt(env.PORT);

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(globalRateLimit);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

const gracefulShutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 Firefly backend running on port ${PORT}`);
      console.log(`📊 Environment: ${env.NODE_ENV}`);
      console.log(`🌐 CORS origin: ${env.CORS_ORIGIN}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app, prisma };
