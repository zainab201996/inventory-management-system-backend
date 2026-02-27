import { Router, Request } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middlewares/auth';

// Extend Request interface to include rateLimit property from express-rate-limit
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number;
        remaining: number;
        resetTime: Date;
        totalHits: number;
      };
    }
  }
}

const router = Router();

// Rate limiter for login endpoint (10 requests per 15 minutes per IP)
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res) => {
    const resetTime = req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime).getTime() : Date.now() + (15 * 60 * 1000);
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again after 15 minutes',
      retryAfter: retryAfter
    });
  }
});

// Public auth routes (no authentication required)
router.post('/login', loginRateLimiter, AuthController.login);
router.post('/verify', AuthController.verifyToken);
router.post('/refresh', AuthController.refreshToken);

// Protected auth routes (authentication required)
// Add protected routes here if needed in the future

export default router;

