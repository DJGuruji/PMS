import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { canManageProject } from '@/lib/project-rbac';
import { z } from 'zod';

const columnSchema = z.object({
  name: z.string().min(1),
  order: z.number().int(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await canManageProject(userId, projectId))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const result = columnSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const column = await prisma.column.create({
      data: {
        ...result.data,
        projectId,
      },
    });

    return NextResponse.json(column, { status: 201 });
  } catch (error) {
    console.error('Create column error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const columns = await prisma.column.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(columns);
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
