import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { canManageProject } from '@/lib/project-rbac';
import { z } from 'zod';

const lifecycleSchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'close']),
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
      return NextResponse.json({ error: 'Admin access required. Only project admins can manage the project lifecycle.' }, { status: 403 });
    }

    const body = await req.json();
    const result = lifecycleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid action', details: result.error.format() }, { status: 400 });
    }

    const { action } = result.data;
    const now = new Date();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true, startedAt: true },
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // State machine guard — prevent illegal transitions
    const allowedTransitions: Record<string, string[]> = {
      IDLE: ['start'],
      ACTIVE: ['pause', 'close'],
      PAUSED: ['resume', 'close'],
      CLOSED: [],
    };

    if (!allowedTransitions[project.status]?.includes(action)) {
      return NextResponse.json({
        error: `Cannot perform "${action}" action on a project in "${project.status}" status.`,
      }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      switch (action) {
        case 'start':
          await tx.project.update({
            where: { id: projectId },
            data: { status: 'ACTIVE', startedAt: now },
          });
          break;

        case 'pause':
          await tx.project.update({
            where: { id: projectId },
            data: { status: 'PAUSED' },
          });
          await tx.projectPause.create({
            data: { projectId, startedAt: now },
          });
          break;

        case 'resume':
          await tx.project.update({
            where: { id: projectId },
            data: { status: 'ACTIVE' },
          });
          await tx.projectPause.updateMany({
            where: { projectId, endedAt: null },
            data: { endedAt: now },
          });
          break;

        case 'close':
          await tx.project.update({
            where: { id: projectId },
            data: { status: 'CLOSED' },
          });
          // Also close any active pause if it was paused
          await tx.projectPause.updateMany({
            where: { projectId, endedAt: null },
            data: { endedAt: now },
          });
          break;
      }
    });

    return NextResponse.json({ message: `Project ${action}ed successfully` });
  } catch (error) {
    console.error('Project lifecycle error:', error);
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
        status: true,
        startedAt: true,
        updatedAt: true,
        pauses: {
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const now = new Date();

    // Compute live elapsed active time
    let totalElapsedMs = 0;
    if (project.startedAt) {
      const endTime = project.status === 'CLOSED' ? project.updatedAt : now;
      totalElapsedMs = endTime.getTime() - project.startedAt.getTime();
    }

    let totalPausedMs = 0;
    let currentPauseStartedAt = null;

    project.pauses.forEach(pause => {
      const end = pause.endedAt || now;
      totalPausedMs += end.getTime() - pause.startedAt.getTime();
      if (!pause.endedAt) {
        currentPauseStartedAt = pause.startedAt;
      }
    });

    const activeMs = totalElapsedMs > totalPausedMs ? totalElapsedMs - totalPausedMs : 0;

    return NextResponse.json({
      status: project.status,
      startedAt: project.startedAt,
      pausedAt: currentPauseStartedAt,
      closedAt: project.status === 'CLOSED' ? project.updatedAt : null,
      totalPausedMs: totalPausedMs.toString(),
      activeMs: activeMs.toString(),
      totalElapsedMs: totalElapsedMs.toString(),
    });
  } catch (error) {
    console.error('Fetch lifecycle error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
