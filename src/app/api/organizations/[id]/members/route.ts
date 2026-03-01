import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId, checkRoleIn } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { sendOrgInviteEmail, sendOrgRemovedEmail } from '@/lib/email';

const addMemberSchema = z.object({
  userId: z.string().min(1),
});

// GET /api/organizations/[id]/members
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const requesterId = getUserId(req);
    if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const members = await prisma.organizationMembership.findMany({
      where: { orgId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Get org members error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST /api/organizations/[id]/members — add a user to the org
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const rbacError = checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN]);
    if (rbacError) return rbacError;

    const actorId = getUserId(req)!;
    const body = await req.json();
    const result = addMemberSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const { userId } = result.data;

    // Validate org and user both exist
    const [org, targetUser] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          projects: { select: { id: true, name: true } },
        },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } }),
    ]);

    if (!org)        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    if (!targetUser) return NextResponse.json({ error: 'User not found' },         { status: 404 });

    // Check if already a member
    const existing = await prisma.organizationMembership.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 409 });
    }

    // Add to org
    const membership = await prisma.organizationMembership.create({
      data: { userId, orgId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });

    // Auto-add as MEMBER to all projects in the org (if not already a member)
    if (org.projects.length > 0) {
      const existingProjectMemberships = await prisma.projectMembership.findMany({
        where: { userId, projectId: { in: org.projects.map((p) => p.id) } },
        select: { projectId: true },
      });
      const existingProjectIds = new Set(existingProjectMemberships.map((m) => m.projectId));
      const newProjectIds = org.projects.filter((p) => !existingProjectIds.has(p.id)).map((p) => p.id);

      if (newProjectIds.length > 0) {
        await prisma.projectMembership.createMany({
          data: newProjectIds.map((projectId) => ({ userId, projectId, role: Role.MEMBER })),
          skipDuplicates: true,
        });
      }
    }

    // Send email notification (fire-and-forget)
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true, email: true } });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    sendOrgInviteEmail({
      toEmail: targetUser.email,
      toName:  targetUser.name,
      orgName: org.name,
      inviterName: actor?.name || actor?.email || 'An admin',
      projectNames: org.projects.map((p) => p.name),
      appUrl,
    }).catch((e) => console.warn('[Email] Invite failed:', e.message));

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error('Add org member error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
