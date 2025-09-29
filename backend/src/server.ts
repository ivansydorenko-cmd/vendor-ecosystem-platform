import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { closePool } from './config/database';
import logger from './utils/logger';

import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import userRoutes from './routes/user.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(compression());

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.use((req: Request, res: Response, next: NextFunction) => {
  const method = req.method;
  const path = req.path;
  logger.info(method + ' ' + path, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin/tenants', tenantRoutes);
app.use('/api/v1/admin/users', userRoutes);

app.use((req: Request, res: Response) => {
  const method = req.method;
  const path = req.path;
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Cannot ' + method + ' ' + path,
    },
    timestamp: new Date().toISOString(),
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: message,
    },
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  logger.info('Server running on port ' + PORT);
  logger.info('Environment: ' + process.env.NODE_ENV);
  logger.info('API URL: http://localhost:' + PORT + '/api/v1');
});

const gracefulShutdown = async (signal: string) => {
  logger.info(signal + ' received, closing server gracefully');
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await closePool();
      logger.info('Database connections closed');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
