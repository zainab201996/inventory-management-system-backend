import { Request, Response, NextFunction } from 'express';
import { AuthModel } from '../features/auth/auth.model';
import { sendUnauthorizedResponse } from '../utils/responseHandler';
import logger from '../utils/logger';
import { getPageSlugForRoute, getPermissionOverrideForRoute, getPermissionFallbackForRoute } from '../config/route-permissions';
import { PageModel } from '../features/pages/page.model';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: number;
        username: string;
        roleIds: number[];
        permissions: { [pageSlug: string]: { show: boolean; create: boolean; edit: boolean; delete: boolean } };
      };
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return sendUnauthorizedResponse(res, 'Access token required');
    }

    // Verify token
    const decoded = await AuthModel.verifyToken(token);
    
    // Get user details
    const user = await AuthModel.getUserById(decoded.user_id);

    if (!user) {
      return sendUnauthorizedResponse(res, 'User not found or inactive');
    }

    if (!user.is_active) {
      return sendUnauthorizedResponse(res, 'User account is inactive');
    }

    // Always fetch permissions from database on each request for real-time updates
    // Permissions are NOT stored in JWT to ensure they are always up-to-date
    const permissions = await AuthModel.refreshUserPermissions(decoded.roleIds);

    // Add user info to request
    req.user = {
      user_id: decoded.user_id,
      username: decoded.username,
      roleIds: decoded.roleIds,
      permissions
    };

    next();
  } catch (error) {
    logger.error('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method
    });
    sendUnauthorizedResponse(res, 'Invalid or expired token');
  }
};

// Permission-based access middleware (using page slug)
export const requirePagePermission = (pageSlug: string, permission: 'show' | 'create' | 'edit' | 'delete') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return sendUnauthorizedResponse(res, 'Authentication required');
    }

    const pagePermissions = req.user.permissions?.[pageSlug];
    if (!pagePermissions || !pagePermissions[permission]) {
      logger.warn('Permission denied - Insufficient rights', {
        userId: req.user.user_id,
        username: req.user.username,
        pageSlug,
        permission,
        method: req.method,
        path: req.path,
        detailedMessage: `Permission '${permission}' on page '${pageSlug}' required`
      });
      return sendUnauthorizedResponse(res, 'Insufficient rights');
    }

    next();
  };
};

// Auto-detect permission based on HTTP method and route
// Maps HTTP methods to permissions: GET -> show, POST -> create, PUT/PATCH -> edit, DELETE -> delete
export const requirePagePermissionByRoute = (pageSlug: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return sendUnauthorizedResponse(res, 'Authentication required');
    }

    // Map HTTP method to permission
    let permission: 'show' | 'create' | 'edit' | 'delete';
    switch (req.method) {
      case 'GET':
        permission = 'show';
        break;
      case 'POST':
        permission = 'create';
        break;
      case 'PUT':
      case 'PATCH':
        permission = 'edit';
        break;
      case 'DELETE':
        permission = 'delete';
        break;
      default:
        return sendUnauthorizedResponse(res, `Unsupported HTTP method: ${req.method}`);
    }

    const pagePermissions = req.user.permissions?.[pageSlug];
    if (!pagePermissions || !pagePermissions[permission]) {
      logger.warn('Permission denied - Insufficient rights', {
        userId: req.user.user_id,
        username: req.user.username,
        pageSlug,
        permission,
        method: req.method,
        path: req.path,
        detailedMessage: `Permission '${permission}' on page '${pageSlug}' required`
      });
      return sendUnauthorizedResponse(res, 'Insufficient rights');
    }

    next();
  };
};

/**
 * Middleware that automatically checks permissions based on the route path
 * Uses the route-to-slug mapping to determine which page slug to check
 * Maps HTTP methods to permissions automatically
 */
export const requirePermissionByRoute = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return sendUnauthorizedResponse(res, 'Authentication required');
    }

    // Exclude auth-related endpoints from permission checking
    // These endpoints are part of authentication and should only require authentication, not page permissions
    const fullPath = (req.baseUrl + req.path).split('?')[0];
    if (fullPath.endsWith('/access')) {
      // Skip permission check for /access endpoints (e.g., /api/users/:id/access)
      return next();
    }

    // Get the route path - construct full path from baseUrl and path
    // For routes mounted at '/api/business-plans', req.baseUrl will be '/api/business-plans'
    // For routes like '/api/business-plans/123/actions/status', req.path will be '/123/actions/status'
    // We need the full path to match action routes correctly
    const routePath = (req.baseUrl + req.path).split('?')[0] || req.originalUrl.split('?')[0];
    const cleanPath = routePath.replace(/\/$/, '');
    
    // Get page slugs for this route (supports method-specific & multi-slug mappings)
    const pageSlugs = getPageSlugForRoute(routePath, req.method);
    
    // Settings route is intentionally unrestricted (no permission check required)
    if (cleanPath === '/api/settings' || cleanPath.startsWith('/api/settings/')) {
      return next();
    }
    
    // Users-departments route is intentionally unrestricted (no permission check required)
    if (cleanPath === '/api/users-departments' || cleanPath.startsWith('/api/users-departments/')) {
      return next();
    }
    
    if (!pageSlugs || pageSlugs.length === 0) {
      // Block unmapped routes by default for security
      // Can be overridden with ALLOW_UNMAPPED_ROUTES env var
      const allowUnmapped = process.env.ALLOW_UNMAPPED_ROUTES === 'true';
      
      if (!allowUnmapped) {
        logger.warn('No page slug mapping found for route - access denied', { 
          routePath, 
          originalUrl: req.originalUrl,
          baseUrl: req.baseUrl,
          path: req.path,
          method: req.method,
          userId: req.user.user_id,
          username: req.user.username
        });
        return sendUnauthorizedResponse(res, 'Route not mapped to any page permissions');
      }
      
      // If ALLOW_UNMAPPED_ROUTES is true, log warning but allow access
      logger.warn('No page slug mapping found for route - allowing access (ALLOW_UNMAPPED_ROUTES=true)', { 
        routePath, 
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        path: req.path,
        method: req.method 
      });
      return next();
    }

    // IMPORTANT: If a route is mapped to a page slug, we MUST check permissions
    // We do NOT skip permission checking even if the page doesn't exist in the database.
    // Permissions come from role_details which are already in the user's JWT token.
    // If the page doesn't exist, the user won't have permissions for it, so access will be denied.
    
    // Optional: Verify page exists (for logging/debugging, but don't skip permission check)
    // We only check the first slug to avoid extra DB queries.
    const page = await PageModel.getPageBySlug(pageSlugs[0]);
    if (!page) {
      logger.warn('Page does not exist in database, but checking permissions anyway', {
        routePath,
        pageSlugs,
        method: req.method,
        userId: req.user.user_id,
        username: req.user.username
      });
      // Continue to permission check - don't skip!
    }

    // Map HTTP method to permission
    let permission: 'show' | 'create' | 'edit' | 'delete';
    switch (req.method) {
      case 'GET':
        permission = 'show';
        break;
      case 'POST':
        permission = 'create';
        break;
      case 'PUT':
      case 'PATCH':
        permission = 'edit';
        break;
      case 'DELETE':
        permission = 'delete';
        break;
      default:
        return sendUnauthorizedResponse(res, `Unsupported HTTP method: ${req.method}`);
    }

    // Optional per-route permission override (e.g., DELETE can require 'edit')
    const permissionOverride = getPermissionOverrideForRoute(routePath, req.method);
    if (permissionOverride) {
      permission = permissionOverride;
    }

    // Allow access if the user has the required permission on ANY of the mapped slugs.
    const permissionBySlug = pageSlugs.map((slug) => ({
      slug,
      perms: req.user?.permissions?.[slug]
    }));

    // Check for permission fallback (e.g., allow 'edit' to satisfy 'create')
    const permissionFallback = getPermissionFallbackForRoute(routePath, req.method);
    
    let allowed: boolean;
    if (permissionFallback && permissionFallback.length > 0) {
      // Check primary permission first, then fallback permissions
      allowed = permissionBySlug.some(({ perms }) => {
        if (perms?.[permission]) return true;
        return permissionFallback.some(fallback => perms?.[fallback]);
      });
    } else {
      allowed = permissionBySlug.some(({ perms }) => !!perms?.[permission]);
    }
    if (!allowed) {
      // Log detailed permission information for debugging
      logger.warn('Permission denied - Insufficient rights', {
        userId: req.user.user_id,
        username: req.user.username,
        routePath,
        pageSlugs,
        permission,
        permissionBySlug: permissionBySlug.map(({ slug, perms }) => ({
          slug,
          hasPage: !!perms,
          perms: perms || null
        })),
        availablePageSlugs: Object.keys(req.user.permissions || {}),
        method: req.method,
        detailedMessage: `Permission '${permission}' on one of these pages required: ${pageSlugs.join(', ')}`
      });
      // Return generic error message to client
      return sendUnauthorizedResponse(res, 'Insufficient rights');
    }

    next();
  };
};

// Role-based access middleware (check if user has any of the allowed role IDs)
export const requireRole = (allowedRoleIds: number[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return sendUnauthorizedResponse(res, 'Authentication required');
    }

    const hasRole = req.user.roleIds?.some(roleId => allowedRoleIds.includes(roleId));
    if (!hasRole) {
      return sendUnauthorizedResponse(res, 'Insufficient permissions');
    }

    next();
  };
};
