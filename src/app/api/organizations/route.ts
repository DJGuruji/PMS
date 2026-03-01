import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId, checkRoleIn } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { z } from 'zod';

const orgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  description: z.string().optional(),
});

// GET /api/organizations — list all orgs accessible to the user
export async function GET(req: Request) {
  try {
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const skip  = (page - 1) * limit;

    // ADMIN/SUB_ADMIN see all orgs; members see only their own
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isPrivileged = user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN';

    const where = isPrivileged
      ? {}
      : { members: { some: { userId } } };

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          createdBy: { select: { name: true, email: true } },
          _count: { select: { members: true, projects: true } },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    return NextResponse.json({
      organizations: orgs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('List organizations error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST /api/organizations — create an organization (ADMIN/SUB_ADMIN)
export async function POST(req: Request) {
  try {
    const rbacError = checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN]);
    if (rbacError) return rbacError;

    const userId = getUserId(req)!;
    const body = await req.json();
    const result = orgSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const org = await prisma.organization.create({
      data: {
        name: result.data.name,
        description: result.data.description,
        createdById: userId,
        // Creator auto-joins as a member
        members: { create: { userId } },
      },
      select: {
        id: true, name: true, description: true, createdAt: true,
        _count: { select: { members: true, projects: true } },
      },
    });

    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    console.error('Create organization error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
