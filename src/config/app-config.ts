/**
 * Application Configuration
 * 
 * Global configuration constants for the application
 */

/**
 * Super Admin User ID
 * 
 * This user ID bypasses filtering restrictions for:
 * - BPD Materials (bypasses sub-division and department filtering)
 * 
 * Note: Circles, Divisions, and Sub-Divisions no longer use super admin bypass.
 * Access to those features is controlled entirely by page permissions.
 * 
 * Can be configured via environment variable SUPER_ADMIN_USER_ID (default: 1)
 */
export const SUPER_ADMIN_USER_ID: number = parseInt(
  process.env.SUPER_ADMIN_USER_ID || '1',
  10
);

/**
 * Check if a user ID is the super admin
 * @param userId - The user ID to check
 * @returns true if the user is the super admin, false otherwise
 */
export function isSuperAdmin(userId?: number): boolean {
  if (!userId) return false;
  return userId === SUPER_ADMIN_USER_ID;
}
