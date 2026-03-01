import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

/**
 * Get the current user's role from middleware-injected headers.
 */
export function getUserRole(req: Request): Role | null {
  return (req.headers.get('x-user-role') as Role) || null;
}

/**
 * Get the current user ID from middleware-injected headers.
 */
export function getUserId(req: Request): string | null {
  return req.headers.get('x-user-id');
}

/**
 * Check if the request user has EXACTLY the required role.
 * ADMIN always passes any check.
 */
export function checkRole(req: Request, requiredRole: Role) {
  const userRole = getUserRole(req);
  if (!userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ADMIN supersedes everything
  if (userRole === Role.ADMIN) return null;

  if (userRole !== requiredRole) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  return null;
}

/**
 * Check if the request user has ANY of the allowed roles.
 * ADMIN always passes.
 * Usage: checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN])
 */
export function checkRoleIn(req: Request, allowedRoles: Role[]) {
  const userRole = getUserRole(req);
  if (!userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  return null;
}

/**
 * Returns true if the user is ADMIN or SUB_ADMIN.
 */
export function isPrivileged(req: Request): boolean {
  const role = getUserRole(req);
  return role === Role.ADMIN || role === Role.SUB_ADMIN;
}

/**
 * Returns true if the user is ADMIN only.
 */
export function isAdmin(req: Request): boolean {
  return getUserRole(req) === Role.ADMIN;
}
