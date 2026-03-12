/**
 * Route to Page Slug Mapping Configuration
 * 
 * This is the single source of truth for route-to-page-slug mappings.
 * To add a new route mapping, simply add it to the ROUTE_PAGE_MAPPINGS object below.
 * 
 * The slug should match the slug in the pages table in the database.
 * 
 * HTTP methods are automatically mapped to permissions:
 * - GET -> show
 * - POST -> create
 * - PUT/PATCH -> edit
 * - DELETE -> delete
 * 
 * @example
 * // To add a new route mapping:
 * '/api/stores': 'stores',
 */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type PermissionType = 'show' | 'create' | 'edit' | 'delete';

export type RoutePermission =
  | string
  | string[]
  | (Partial<Record<HttpMethod, string | string[]>> & {
      default: string | string[];
      /**
       * Optional permission override per method.
       * Example: { DELETE: 'edit' } means DELETE will require 'edit' permission instead of 'delete'.
       */
      permissionOverride?: Partial<Record<HttpMethod, PermissionType>>;
      /**
       * Optional permission fallback per method.
       * If the primary permission is not found, check for these fallback permissions.
       * Example: { POST: ['edit'] } means if 'create' permission is not found, also check for 'edit'.
       */
      permissionFallback?: Partial<Record<HttpMethod, PermissionType[]>>;
    });

export const ROUTE_PAGE_MAPPINGS: { [routePath: string]: RoutePermission } = {
  // User Management - maps to 'users' page (slug: 'users')
  '/api/users': { GET: ['users', 'audit-trail'], default: 'users'},
  
  // Role Management - maps to 'roles' page (slug: 'roles')
  '/api/roles': 'roles',
  '/api/role-details': 'roles', // Role details are part of roles page
  
  // Page Management - maps to 'roles' page (slug: 'roles')
  '/api/pages': {GET: ['roles', 'audit-trail'], default: 'roles'},
  
  // Audit Trail - maps to 'audit-trail' page (slug: 'audit-trail')
  '/api/audit-trail': 'audit-trail',
  
  // Inventory Management Routes
  '/api/stores': 'stores',
  '/api/items': 'items',
  '/api/rates': 'rates',
  '/api/store-transfer-notes': 'store-transfer-notes',
  // Inventory Reports - reuse store-transfer-notes permissions
  '/api/reports': 'store-transfer-notes',
  // Inventory Dashboard - reuse store-transfer-notes permissions
  '/api/dashboard': 'store-transfer-notes',
  
  // Note: /api/auth routes are intentionally not mapped (public routes)
};

/**
 * Route to Page Slug Mapping (exported for backward compatibility)
 * @deprecated Use ROUTE_PAGE_MAPPINGS instead
 */
export const routeToPageSlug = ROUTE_PAGE_MAPPINGS;

function normalizeToArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

function getMappingForMethod(mapping: RoutePermission, method?: string): string[] {
  if (typeof mapping === 'string' || Array.isArray(mapping)) {
    return normalizeToArray(mapping);
  }

  const m = (method || '').toUpperCase() as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  const methodValue = mapping[m];
  if (methodValue) {
    return normalizeToArray(methodValue);
  }

  return normalizeToArray(mapping.default);
}

export function getPermissionOverrideForRoute(routePath: string, method?: string): PermissionType | null {
  const cleanPath = routePath.split('?')[0].replace(/\/$/, '');
  const m = (method || '').toUpperCase() as HttpMethod;

  const resolveOverride = (mapping: RoutePermission): PermissionType | null => {
    if (typeof mapping === 'string' || Array.isArray(mapping)) return null;
    return mapping.permissionOverride?.[m] ?? null;
  };

  if (ROUTE_PAGE_MAPPINGS[cleanPath]) {
    return resolveOverride(ROUTE_PAGE_MAPPINGS[cleanPath]);
  }

  for (const [route, mapping] of Object.entries(ROUTE_PAGE_MAPPINGS)) {
    if (cleanPath === route || cleanPath.startsWith(route + '/')) {
      return resolveOverride(mapping);
    }
  }

  return null;
}

export function getPermissionFallbackForRoute(routePath: string, method?: string): PermissionType[] | null {
  const cleanPath = routePath.split('?')[0].replace(/\/$/, '');
  const m = (method || '').toUpperCase() as HttpMethod;

  const resolveFallback = (mapping: RoutePermission): PermissionType[] | null => {
    if (typeof mapping === 'string' || Array.isArray(mapping)) return null;
    return mapping.permissionFallback?.[m] ?? null;
  };

  if (ROUTE_PAGE_MAPPINGS[cleanPath]) {
    return resolveFallback(ROUTE_PAGE_MAPPINGS[cleanPath]);
  }

  for (const [route, mapping] of Object.entries(ROUTE_PAGE_MAPPINGS)) {
    if (cleanPath === route || cleanPath.startsWith(route + '/')) {
      const fallback = resolveFallback(mapping);
      if (fallback) return fallback;
    }
  }

  return null;
}

/**
 * Get page slug for a given route path
 * 
 * This function uses ROUTE_PAGE_MAPPINGS to find the corresponding page slug.
 * You don't need to modify this function when adding new routes - just add them to ROUTE_PAGE_MAPPINGS.
 * @param routePath - The route path (e.g., '/api/users' or '/api/users/123')
 * @returns The page slugs (one or more) or null if not found
 */
export function getPageSlugForRoute(routePath: string, method?: string): string[] | null {
  // Remove query parameters and trailing slashes
  let cleanPath = routePath.split('?')[0].replace(/\/$/, '');
  
  // Check exact match first (most efficient)
  if (ROUTE_PAGE_MAPPINGS[cleanPath]) {
    return getMappingForMethod(ROUTE_PAGE_MAPPINGS[cleanPath], method);
  }
  
  // For paths with IDs or sub-paths (e.g., /api/users/123)
  // Try to match the base route by checking if the path starts with any mapped route
  for (const [route, mapping] of Object.entries(ROUTE_PAGE_MAPPINGS)) {
    // Check if the path starts with the route followed by '/' or is exactly the route
    if (cleanPath === route || cleanPath.startsWith(route + '/')) {
      return getMappingForMethod(mapping, method);
    }
  }
  
  return null;
}
