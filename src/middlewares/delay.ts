import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to add a 2 second delay to every request
 * For testing purposes only
 */
export const delayMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Wait 2 seconds before proceeding
  await new Promise(resolve => setTimeout(resolve, 2000));
  next();
};

