import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

/**
 * Helper to check if the current user has the required role
 * @param req The incoming request with headers from middleware
 * @param requiredRole The role needed for the action
 * @returns Error response if unauthorized, null if authorized
 */
export function checkRole(req: Request, requiredRole: Role) {
  const userRole = req.headers.get('x-user-role') as Role;

  if (!userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin can do anything
  if (userRole === Role.ADMIN) {
    return null;
  }

  // If requiring Admin but user is Member
  if (requiredRole === Role.ADMIN && userRole === Role.MEMBER) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return null;
}

/**
 * Get the current user ID from headers
 */
export function getUserId(req: Request) {
  return req.headers.get('x-user-id');
}
