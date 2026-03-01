import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId, checkRoleIn, isAdmin } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

// GET /api/admin/users?page=1&limit=10&search=
export async function GET(req: Request) {
  try {
    const rbacError = checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN]);
    if (rbacError) return rbacError;

    const { searchParams } = new URL(req.url);
    const page   = Math.max(1, parseInt(searchParams.get('page')   || '1'));
    const limit  = Math.min(50, parseInt(searchParams.get('limit')  || '10'));
    const search = searchParams.get('search') || '';
    const skip   = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name:  { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: {
            select: { projects: true, assignedCards: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST /api/admin/users — create a new user
export async function POST(req: Request) {
  try {
    const rbacError = checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN]);
    if (rbacError) return rbacError;

    const body = await req.json();
    const result = createSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const { email, name, password, role } = result.data;

    // SUB_ADMIN cannot create ADMIN users
    if (!isAdmin(req) && role === 'ADMIN') {
      return NextResponse.json({ error: 'Sub-admins cannot create admin users' }, { status: 403 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, password: hashed, role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
