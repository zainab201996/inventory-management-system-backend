import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import { sendErrorResponse } from '../utils/responseHandler';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err } as AppError;
  error.message = err.message;

  // Log error
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // PostgreSQL unique violation
  if ((err as any).code === '23505') {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // PostgreSQL foreign key violation
  if ((err as any).code === '23503') {
    const message = 'Referenced resource not found';
    error = new AppError(message, 400);
  }

  // PostgreSQL not null violation
  if ((err as any).code === '23502') {
    const message = 'Required field is missing';
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  sendErrorResponse(res, error.message, error.statusCode || 500);
};

