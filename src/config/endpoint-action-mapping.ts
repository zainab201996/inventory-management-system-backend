/**
 * Endpoint to Action Page Name Mapping
 * 
 * This file provides a mapping of action endpoints to their corresponding action page names.
 * Action pages are pages with is_action = true in the pages table.
 * 
 * This mapping is used for:
 * - Audit trail logging to ensure action endpoints use action page names
 * - Documentation and reference
 * - Validation that action endpoints are correctly mapped
 */

export interface ActionPageMapping {
  endpoint: string;
  method: string;
  pageSlug: string;
  pageName: string;
  description: string;
  pageId: number; // Page ID from pages table
}

/**
 * Complete mapping of action endpoints to action page names
 * 
 * Format: endpoint pattern -> { pageSlug, pageName, description }
 * 
 * Note: Endpoints with :id should be matched using the base pattern
 * (e.g., '/api/business-plans/:id/actions/start' matches '/api/business-plans/123/actions/start')
 */
export const ENDPOINT_ACTION_PAGE_MAPPINGS: ActionPageMapping[] = [
  // Business Plan Actions
  {
    endpoint: '/api/business-plans/:id/actions/start',
    method: 'PUT',
    pageSlug: 'business-plan-start',
    pageName: 'Project Initiation',
    pageId: 27, // From seed-database.sql
    description: 'Start a business plan (status 0 → 1)'
  },
  {
    endpoint: '/api/business-plans/:id/actions/complete',
    method: 'PUT',
    pageSlug: 'business-plan-detail-complete',
    pageName: 'Business Plan Detail Complete',
    pageId: 29, // From seed-database.sql
    description: 'Complete a business plan (status 1 → 2)'
  },
  {
    endpoint: '/api/business-plans/:id/actions/cancel',
    method: 'PUT',
    pageSlug: 'business-plan-cancel',
    pageName: 'Business Plan Cancellation',
    pageId: 47, // From seed-database.sql
    description: 'Cancel a business plan (status 1 → 3)'
  },
  
  // Business Plan Detail Actions
  {
    endpoint: '/api/business-plans-detail/:id/actions/start',
    method: 'PUT',
    pageSlug: 'business-plan-detail-start',
    pageName: 'Business Plan Detail Start',
    pageId: 28, // From seed-database.sql
    description: 'Start a business plan detail/step (status 0 → 1)'
  },
  {
    endpoint: '/api/business-plans-detail/:id/actions/complete',
    method: 'PUT',
    pageSlug: 'business-plan-detail-complete',
    pageName: 'Business Plan Detail Complete',
    pageId: 29, // From seed-database.sql
    description: 'Complete a business plan detail/step (status 1 → 2)'
  },
  
  // BPD Material Actions
  {
    endpoint: '/api/bpd-materials/:id/actions/allocate',
    method: 'PUT',
    pageSlug: 'bpd-material-allocate',
    pageName: 'BPD Material Allocate',
    pageId: 40, // From seed-database.sql
    description: 'Allocate BPD material (status 0 → 1)'
  },
  {
    endpoint: '/api/bpd-materials/:id/actions/use',
    method: 'PUT',
    pageSlug: 'bpd-material-use',
    pageName: 'BPD Material Use',
    pageId: 45, // From seed-database.sql
    description: 'Use BPD material (status 1 → 2)'
  },
  
  // Project Issue Actions
  {
    endpoint: '/api/project-issues/actions/open',
    method: 'POST',
    pageSlug: 'project-issue-open',
    pageName: 'Project Issue Open',
    pageId: 22, // From seed-database.sql
    description: 'Open a project issue (create with status 0)'
  },
  {
    endpoint: '/api/project-issues/:id/actions/complete',
    method: 'PUT',
    pageSlug: 'project-issue-complete',
    pageName: 'Project Issue Complete',
    pageId: 31, // From seed-database.sql
    description: 'Complete a project issue (status 0 → 2)'
  }
];

/**
 * Get action page mapping for a given endpoint path and method
 * 
 * @param routePath - The route path (e.g., '/api/business-plans/123/actions/start')
 * @param method - The HTTP method (e.g., 'PUT')
 * @returns The action page mapping or null if not found
 */
export function getActionPageMapping(
  routePath: string,
  method: string
): ActionPageMapping | null {
  // Remove query parameters and normalize path
  const cleanPath = routePath.split('?')[0];
  const normalizedMethod = method.toUpperCase();
  
  // Try to match each mapping
  for (const mapping of ENDPOINT_ACTION_PAGE_MAPPINGS) {
    // Convert endpoint pattern to regex
    // Replace :id with \d+ to match any number
    const pattern = mapping.endpoint.replace(/:\w+/g, '\\d+');
    const regex = new RegExp(`^${pattern}$`);
    
    // Check if path matches and method matches
    if (regex.test(cleanPath) && mapping.method.toUpperCase() === normalizedMethod) {
      return mapping;
    }
  }
  
  return null;
}

/**
 * Check if an endpoint is an action endpoint
 * 
 * @param routePath - The route path
 * @param method - The HTTP method
 * @returns True if the endpoint is an action endpoint
 */
export function isActionEndpoint(routePath: string, method: string): boolean {
  return getActionPageMapping(routePath, method) !== null;
}

/**
 * Get all action page mappings (for documentation/reference)
 * 
 * @returns Array of all action page mappings
 */
export function getAllActionPageMappings(): ActionPageMapping[] {
  return [...ENDPOINT_ACTION_PAGE_MAPPINGS];
}

