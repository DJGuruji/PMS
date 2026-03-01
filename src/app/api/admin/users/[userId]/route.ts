import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId, checkRoleIn, isAdmin } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'SUB_ADMIN', 'MEMBER']).optional(),
  // Password reset — admin provides a new password directly (no current password needed)
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

// PATCH /api/admin/users/[userId]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const rbacError = checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN]);
    if (rbacError) return rbacError;

    const { userId } = await params;
    const actorId = getUserId(req);

    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const { name, role, newPassword } = result.data;

    // SUB_ADMIN cannot change anyone's role to ADMIN
    if (!isAdmin(req) && role === 'ADMIN') {
      return NextResponse.json({ error: 'Sub-admins cannot assign the Admin role' }, { status: 403 });
    }

    // Prevent admin from downgrading their own role
    if (actorId === userId && role === 'MEMBER') {
      return NextResponse.json({ error: 'You cannot remove your own admin role' }, { status: 403 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[userId]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const rbacError = checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN]);
    if (rbacError) return rbacError;

    const { userId } = await params;
    const actorId = getUserId(req);

    if (actorId === userId) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 403 });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: `User ${target.email} deleted` });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// GET /api/admin/users/[userId] — single user details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const rbacError = checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN]);
    if (rbacError) return rbacError;

    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { projectMemberships: true, assignedCards: true } },
        projectMemberships: {
          select: {
            role: true,
            project: { select: { id: true, name: true, status: true } },
          },
        },
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
