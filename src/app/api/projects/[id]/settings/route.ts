import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { canManageProject } from '@/lib/project-rbac';
import { z } from 'zod';
import { serializeBigInt } from '@/lib/serializer';

const settingsSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').optional(),
  description: z.string().optional(),
  cardMovementMode: z.enum(['FREE', 'FORWARD_ONLY']).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await canManageProject(userId, projectId))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const result = settingsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: result.data,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        projectId,
        action: 'UPDATE',
        entity: 'PROJECT_SETTINGS',
        entityId: projectId,
        details: result.data as object,
      },
    });

    return NextResponse.json(serializeBigInt(project));
  } catch (error) {
    console.error('Update settings error:', error);
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

    const { getProjectRole } = await import('@/lib/project-rbac');
    const role = await getProjectRole(userId, projectId);
    if (!role) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        cardMovementMode: true,
        startedAt: true,
        pausedAt: true,
        closedAt: true,
        totalPausedMs: true,
        labels: { orderBy: { createdAt: 'asc' } },
        priorities: { orderBy: { weight: 'desc' } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    return NextResponse.json(serializeBigInt(project));
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
