import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRoleIn } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { serializeBigInt } from '@/lib/serializer';

// GET /api/admin/projects — admin-only paginated project list with creator info
export async function GET(req: Request) {
  try {
    const rbacError = checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN]);
    if (rbacError) return rbacError;

    const { searchParams } = new URL(req.url);
    const page   = Math.max(1, parseInt(searchParams.get('page')   || '1'));
    const limit  = Math.min(50, parseInt(searchParams.get('limit')  || '10'));
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const skip   = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name:        { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          creator: { select: { name: true, email: true } },
          _count: {
            select: { members: true, cards: true, columns: true },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      projects: projects.map(serializeBigInt),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Admin projects list error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
