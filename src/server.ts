import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { AppError } from './utils/AppError';
import { errorHandler } from './middlewares/errorHandler';
import typeormConnection from './db/typeorm-connection';
import logger from './utils/logger';
 
// Import routes - Core features only
import authRoutes from './features/auth/auth.routes';
import userRoutes from './features/users/user.routes';
import roleRoutes from './features/roles/role.routes';
import pageRoutes from './features/pages/page.routes';
import roleDetailRoutes from './features/role-details/role-detail.routes';
import auditTrailRoutes from './features/audit-trail/audit-trail.routes';

// Import routes - Inventory features
import storeRoutes from './features/stores/store.routes';
import itemRoutes from './features/items/item.routes';
import rateRoutes from './features/rates/rate.routes';
import storeTransferNoteRoutes from './features/store-transfer-notes/store-transfer-note.routes';
import reportRoutes from './features/reports/report.routes';
import settingsRoutes from './features/settings/settings.routes';

// Load environment variables
dotenv.config({ path: './env' });

// Validate environment variables
function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'default_secret') {
      logger.error('JWT_SECRET is required in production environment');
      logger.error('Please set JWT_SECRET in your environment variables');
      process.exit(1);
    }
    
    if (!process.env.JWT_REFRESH_SECRET) {
      logger.error('JWT_REFRESH_SECRET is required in production environment');
      logger.error('Please set JWT_REFRESH_SECRET in your environment variables');
      process.exit(1);
    }
    
    if (process.env.JWT_SECRET.length < 32) {
      logger.error('JWT_SECRET must be at least 32 characters long in production');
      process.exit(1);
    }
    
    if (process.env.JWT_REFRESH_SECRET.length < 32) {
      logger.error('JWT_REFRESH_SECRET must be at least 32 characters long in production');
      process.exit(1);
    }
  }
}

validateEnvironment();

const app: Application = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
logger.info('Security middleware applied with CORS origins:', {
  origins: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : ['http://localhost:3000', 'http://localhost:3001']
});
console.log(process.env.ALLOWED_ORIGINS);
console.log(process.env.NODE_ENV);
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Delay middleware for testing purposes (adds 2 second delay to every request)
// app.use(delayMiddleware);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Inventory Management Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes - Core features
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/role-details', roleDetailRoutes);
app.use('/api/audit-trail', auditTrailRoutes);

// API routes - Inventory features
app.use('/api/stores', storeRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/store-transfer-notes', storeTransferNoteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Handle undefined routes
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  const server = (global as any).server;
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }
  
  await typeormConnection.close();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer(): Promise<void> {
  try {
    // Initialize TypeORM connection
    await typeormConnection.initialize();
    logger.info('TypeORM DataSource initialized');

    // Run pending migrations
    await typeormConnection.runMigrations();

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`Inventory Management Server started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Store server reference for graceful shutdown
    (global as any).server = server;
  } catch (error) {
    logger.error('Failed to start server:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: reason instanceof Error ? reason.message : reason
  });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

startServer();

