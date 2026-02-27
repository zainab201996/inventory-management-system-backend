import { Request } from 'express';
import { AuditTrailModel, AuditEventType } from '../features/audit-trail/audit-trail.model';
import { getPageSlugForRoute } from '../config/route-permissions';
import { getActionPageMapping, isActionEndpoint } from '../config/endpoint-action-mapping';
import logger from './logger';

/**
 * Helper function to log audit trail for create, edit, or delete operations
 * This function automatically determines the page_id from the route and gets the user_id from the request
 * 
 * When isAction=true, this function validates that the endpoint is an action endpoint and uses the action page name.
 * 
 * @param req - Express request object (must have req.user set by auth middleware)
 * @param eventType - The type of event ('create', 'edit', 'delete')
 * @param isAction - Whether this is a status-related action (default: false)
 * @returns Promise that resolves when audit trail is logged (or rejects if there's an error)
 */
export async function logAuditTrail(
  req: Request,
  eventType: AuditEventType,
  isAction: boolean = false
): Promise<void> {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.user_id) {
      logger.warn('Cannot log audit trail: user not authenticated', {
        path: req.path,
        method: req.method
      });
      return;
    }

    // Get the route path - construct full path from baseUrl and path
    // For routes mounted at '/api/business-plans', req.baseUrl will be '/api/business-plans'
    // For routes like '/api/business-plans/123/actions/start', req.path will be '/123/actions/start'
    // We need the full path to match action routes correctly
    const routePath = (req.baseUrl + req.path).split('?')[0] || req.originalUrl.split('?')[0];
    
    logger.debug('Audit trail logging', {
      routePath,
      baseUrl: req.baseUrl,
      path: req.path,
      originalUrl: req.originalUrl,
      method: req.method,
      eventType,
      isAction
    });
    
    // Check if this is an action endpoint first
    const actionMapping = getActionPageMapping(routePath, req.method);
    
    // If isAction=true, use page_id directly from the action mapping
    if (isAction && actionMapping) {
      // Use page_id directly from the mapping for action endpoints
      const auditResult = await AuditTrailModel.logAudit(eventType, actionMapping.pageId, req.user.user_id, isAction);
      
      // Verify the insert was successful
      if (!auditResult || auditResult.id === 0) {
        logger.error('Audit trail insert failed for action endpoint', {
          eventType,
          pageId: actionMapping.pageId,
          pageSlug: actionMapping.pageSlug,
          pageName: actionMapping.pageName,
          userId: req.user.user_id,
          routePath,
          method: req.method,
          auditResult
        });
        return;
      }
      
      logger.info('Audit trail logged with action page', {
        eventType,
        pageId: actionMapping.pageId,
        pageSlug: actionMapping.pageSlug,
        pageName: actionMapping.pageName,
        userId: req.user.user_id,
        isAction,
        auditId: auditResult.id
      });
      return;
    }
    
    // If isAction=true but no action mapping found, log warning
    if (isAction && !actionMapping) {
      logger.warn('Audit trail: isAction=true but endpoint is not an action endpoint', {
        routePath,
        path: req.path,
        method: req.method,
        eventType
      });
      // Continue with regular page lookup as fallback
    }

    // For non-action endpoints, get page slug from route and look up page_id
    const pageSlugs = getPageSlugForRoute(routePath, req.method);

    if (!pageSlugs || pageSlugs.length === 0) {
      logger.warn('Cannot log audit trail: no page slug found for route', {
        routePath,
        path: req.path,
        method: req.method,
        eventType
      });
      return;
    }

    // Try each page slug in order until we find one that exists
    let pageId: number | null = null;
    let pageSlug: string | null = null;
    
    for (const slug of pageSlugs) {
      const foundPageId = await AuditTrailModel.getPageIdBySlug(slug);
      if (foundPageId) {
        pageId = foundPageId;
        pageSlug = slug;
        break;
      }
    }
    
    if (!pageId || !pageSlug) {
      logger.error('Cannot log audit trail: none of the page slugs found in database', {
        pageSlugs,
        routePath,
        method: req.method,
        eventType,
        triedSlugs: pageSlugs
      });
      return;
    }

    // Log the audit trail for non-action endpoints
    const auditResult = await AuditTrailModel.logAudit(eventType, pageId, req.user.user_id, isAction);
    
    // Verify the insert was successful
    if (!auditResult || auditResult.id === 0) {
      logger.error('Audit trail insert failed or returned invalid result', {
        eventType,
        pageId,
        pageSlug,
        userId: req.user.user_id,
        routePath,
        method: req.method,
        auditResult
      });
      return;
    }
    
    logger.info('Audit trail logged successfully', {
      eventType,
      pageId,
      pageSlug,
      userId: req.user.user_id,
      isAction,
      routePath,
      method: req.method,
      auditId: auditResult.id
    });
  } catch (error) {
    // Log error but don't throw - audit trail failures shouldn't break the main operation
    logger.error('Error logging audit trail', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method,
      eventType,
      isAction
    });
  }
}
