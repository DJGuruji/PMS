import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

/**
 * Check if a user has a specific role WITHIN a project
 */
export async function getProjectRole(userId: string, projectId: string) {
  // First check if user is a global ADMIN
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (user?.role === Role.ADMIN) {
    return Role.ADMIN;
  }

  // Check project membership
  const membership = await prisma.projectMembership.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId
      }
    }
  });

  return membership?.role || null;
}

/**
 * Validate that the user is a Project Admin or Global Admin
 */
export async function canManageProject(userId: string, projectId: string) {
  const role = await getProjectRole(userId, projectId);
  return role === Role.ADMIN;
}
