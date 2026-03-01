import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId, checkRoleIn } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { sendOrgRemovedEmail } from '@/lib/email';

// DELETE /api/organizations/[id]/members/[userId]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: orgId, userId: targetUserId } = await params;
    const rbacError = checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN]);
    if (rbacError) return rbacError;

    const [org, membership] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
      prisma.organizationMembership.findUnique({
        where: { userId_orgId: { userId: targetUserId, orgId } },
        include: { user: { select: { email: true, name: true } } },
      }),
    ]);

    if (!org)        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    if (!membership) return NextResponse.json({ error: 'User is not a member of this organization' }, { status: 404 });

    await prisma.$transaction([
      // First, remove user from all projects belonging to this organization
      prisma.projectMembership.deleteMany({
        where: {
          userId: targetUserId,
          project: { organizationId: orgId },
        },
      }),
      // Then remove user from the organization itself
      prisma.organizationMembership.delete({
        where: { userId_orgId: { userId: targetUserId, orgId } },
      }),
    ]);

    // Send removal email (fire-and-forget)
    sendOrgRemovedEmail({
      toEmail: membership.user.email,
      toName:  membership.user.name,
      orgName: org.name,
    }).catch((e) => console.warn('[Email] Removal notification failed:', e.message));

    return NextResponse.json({ message: 'Member removed from organization' });
  } catch (error) {
    console.error('Remove org member error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
