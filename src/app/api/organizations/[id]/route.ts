import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId, checkRoleIn } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

// GET /api/organizations/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        projects: {
          select: {
            id: true, name: true, status: true, createdAt: true,
            _count: { select: { members: true, cards: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { members: true, projects: true } },
      },
    });

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    // Only org members or privileged users can view
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isPrivileged = user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN';
    const isMember = org.members.some((m) => m.userId === userId);

    if (!isPrivileged && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(org);
  } catch (error) {
    console.error('Get org error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// PATCH /api/organizations/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rbacError = checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN]);
    if (rbacError) return rbacError;

    const userId = getUserId(req)!;
    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const org = await prisma.organization.update({
      where: { id },
      data: result.data,
      select: { id: true, name: true, description: true, updatedAt: true },
    });

    return NextResponse.json(org);
  } catch (error) {
    console.error('Update org error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE /api/organizations/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rbacError = checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN]);
    if (rbacError) return rbacError;

    const userId = getUserId(req)!;

    const org = await prisma.organization.findUnique({
      where: { id },
      select: { name: true },
    });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    // Unlink projects (set organizationId to null) instead of deleting them
    await prisma.project.updateMany({ where: { organizationId: id }, data: { organizationId: null } });
    await prisma.organization.delete({ where: { id } });

    return NextResponse.json({ message: `Organization "${org.name}" deleted` });
  } catch (error) {
    console.error('Delete org error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
