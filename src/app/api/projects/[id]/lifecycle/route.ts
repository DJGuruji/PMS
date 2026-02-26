import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { canManageProject } from '@/lib/project-rbac';
import { z } from 'zod';
import { serializeBigInt } from '@/lib/serializer';

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
      select: { status: true, startedAt: true, pausedAt: true, totalPausedMs: true },
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

    let updateData: Record<string, unknown> = {};
    let auditAction = '';

    switch (action) {
      case 'start':
        updateData = { status: 'ACTIVE', startedAt: now };
        auditAction = 'PROJECT_STARTED';
        break;

      case 'pause':
        updateData = { status: 'PAUSED', pausedAt: now };
        auditAction = 'PROJECT_PAUSED';
        break;

      case 'resume': {
        // Accumulate the time this pause lasted
        const pauseDurationMs = project.pausedAt
          ? BigInt(now.getTime()) - BigInt(project.pausedAt.getTime())
          : BigInt(0);
        updateData = {
          status: 'ACTIVE',
          pausedAt: null,
          totalPausedMs: project.totalPausedMs + pauseDurationMs,
        };
        auditAction = 'PROJECT_RESUMED';
        break;
      }

      case 'close': {
        let additionalPausedMs = BigInt(0);
        if (project.status === 'PAUSED' && project.pausedAt) {
          additionalPausedMs = BigInt(now.getTime()) - BigInt(project.pausedAt.getTime());
        }
        updateData = {
          status: 'CLOSED',
          closedAt: now,
          pausedAt: null,
          totalPausedMs: project.totalPausedMs + additionalPausedMs,
        };
        auditAction = 'PROJECT_CLOSED';
        break;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.project.update({
        where: { id: projectId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          userId,
          projectId,
          action: auditAction,
          entity: 'PROJECT',
          entityId: projectId,
          details: { fromStatus: project.status, toStatus: String(updateData.status) },
        },
      });

      return p;
    });

    // Serialize BigInt for JSON
    return NextResponse.json(serializeBigInt(updated));
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
        pausedAt: true,
        closedAt: true,
        totalPausedMs: true,
      },
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const now = new Date();

    // Compute live elapsed active time server-side
    let totalElapsedMs = BigInt(0);
    if (project.startedAt) {
      const endTime = project.closedAt ?? now;
      totalElapsedMs = BigInt(endTime.getTime()) - BigInt(project.startedAt.getTime());
    }

    // If currently paused, add time from last paused → now to totalPausedMs for accurate active calc
    let livePausedMs = project.totalPausedMs;
    if (project.status === 'PAUSED' && project.pausedAt) {
      livePausedMs += BigInt(now.getTime()) - BigInt(project.pausedAt.getTime());
    }

    const activeMs = totalElapsedMs > livePausedMs ? totalElapsedMs - livePausedMs : BigInt(0);

    return NextResponse.json({
      status: project.status,
      startedAt: project.startedAt,
      pausedAt: project.pausedAt,
      closedAt: project.closedAt,
      totalPausedMs: livePausedMs.toString(),
      activeMs: activeMs.toString(),
      totalElapsedMs: totalElapsedMs.toString(),
    });
  } catch (error) {
    console.error('Fetch lifecycle error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
