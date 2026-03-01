import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { getProjectRole } from '@/lib/project-rbac';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        columnTimes: {
          include: { column: true },
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const role = await getProjectRole(userId, card.projectId);
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let totalTimeSeconds = 0;
    const timeline = card.columnTimes.map(ct => {
      const endedAt = ct.endedAt || new Date();
      const durationSeconds = Math.floor((endedAt.getTime() - ct.startedAt.getTime()) / 1000);
      totalTimeSeconds += durationSeconds;
      return {
        columnName: ct.column.name,
        enteredAt: ct.startedAt,
        leftAt: ct.endedAt,
        durationSeconds,
        isCurrent: !ct.endedAt,
      };
    });

    return NextResponse.json({
      totalTimeSeconds,
      timeline,
    });
  } catch (error) {
    console.error('Fetch card timeline error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
