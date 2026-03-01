import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { canManageProject } from '@/lib/project-rbac';
import { Role } from '@prisma/client';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().optional(),
  role: z.nativeEnum(Role).default(Role.MEMBER),
}).refine(data => data.email || data.userId, {
  message: "Either email or userId must be provided",
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await canManageProject(userId, projectId))) {
      return NextResponse.json({ error: 'Only admins can invite members' }, { status: 403 });
    }

    const body = await req.json();
    const result = inviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const { email, userId: targetUserId, role } = result.data;

    const userToInvite = await prisma.user.findFirst({
      where: targetUserId ? { id: targetUserId } : { email },
    });

    if (!userToInvite) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Enforce Organization membership boundary
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true }
    });
    
    if (project?.organizationId) {
      const isOrgMember = await prisma.organizationMembership.findUnique({
        where: { userId_orgId: { userId: userToInvite.id, orgId: project.organizationId } }
      });
      if (!isOrgMember) {
        return NextResponse.json({ error: 'User must be a member of the organization first' }, { status: 403 });
      }
    }

    const membership = await prisma.projectMembership.upsert({
      where: {
        userId_projectId: {
          userId: userToInvite.id,
          projectId,
        },
      },
      update: { role },
      create: {
        userId: userToInvite.id,
        projectId,
        role,
      },
    });

    return NextResponse.json(membership);
  } catch (error) {
    console.error('Invite member error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Any project member can list members
    const membership = await prisma.projectMembership.findUnique({
      where: { userId_projectId: { userId, projectId } }
    });

    // Or global admin
    const globalUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

    if (!membership && globalUser?.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const members = await prisma.projectMembership.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } }
      }
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true }
    });

    let availableUsers: { id: string, name: string | null, email: string, role: string }[] = [];
    if (project?.organizationId) {
      const memberIds = new Set(members.map(m => m.user.id));
      const orgMembers = await prisma.organizationMembership.findMany({
        where: { orgId: project.organizationId },
        include: { user: { select: { id: true, email: true, name: true, role: true } } }
      });
      
      availableUsers = orgMembers
        .map(om => om.user)
        .filter(u => !memberIds.has(u.id));
    }

    return NextResponse.json({ members, availableUsers });
  } catch (error) {
    console.error('Fetch members error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
