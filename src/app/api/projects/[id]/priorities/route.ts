import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { canManageProject } from '@/lib/project-rbac';
import { z } from 'zod';

const prioritySchema = z.object({
  name: z.string().min(1),
  weight: z.number().int().min(1).max(10),
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
    const result = prioritySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const priority = await prisma.priority.create({
      data: {
        ...result.data,
        projectId,
      },
    });

    return NextResponse.json(priority, { status: 201 });
  } catch (error) {
    console.error('Create priority error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const priorities = await prisma.priority.findMany({
      where: { projectId },
      orderBy: { weight: 'desc' },
    });
    return NextResponse.json(priorities);
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
