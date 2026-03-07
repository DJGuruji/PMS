import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { getProjectRole } from '@/lib/project-rbac';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = await getProjectRole(userId, projectId);
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        pauses: true,
        cards: {
          include: {
            columnTimes: true,
            column: true,
          }
        },
        columns: true
      }
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const now = new Date();

    // 1. Project Duration Logic
    let totalElapsedMs = 0;
    if (project.startedAt) {
      const endTime = project.status === 'CLOSED' ? project.updatedAt : now;
      totalElapsedMs = endTime.getTime() - project.startedAt.getTime();
    }

    let totalPausedMs = 0;
    project.pauses.forEach(p => {
      const end = p.endedAt || now;
      totalPausedMs += end.getTime() - p.startedAt.getTime();
    });

    const activeMs = totalElapsedMs > totalPausedMs ? totalElapsedMs - totalPausedMs : 0;

    // 2. Card Statistics
    const totalCards = project.cards.length;
    const closedCards = project.cards.filter(c => c.closedAt !== null).length;

    // 3. Column Distribution & Time
    const columnStats = project.columns.map(col => {
      const cardsInCol = project.cards.filter(c => c.columnId === col.id).length;
      
      // Calculate avg time spent in this column
      const cardTimesInCol = project.cards.flatMap(c => 
        c.columnTimes.filter(ct => ct.columnId === col.id)
      );
      
      let totalMsInCol = 0;
      cardTimesInCol.forEach(ct => {
        const end = ct.endedAt || now;
        totalMsInCol += end.getTime() - ct.startedAt.getTime();
      });

      return {
        id: col.id,
        name: col.name,
        cardCount: cardsInCol,
        averageTimeSeconds: cardTimesInCol.length > 0 ? Math.floor((totalMsInCol / cardTimesInCol.length) / 1000) : 0,
        totalTimeSeconds: Math.floor(totalMsInCol / 1000)
      };
    });

    return NextResponse.json({
      projectId,
      name: project.name,
      status: project.status,
      durations: {
        activeSeconds: Math.floor(activeMs / 1000),
        pausedSeconds: Math.floor(totalPausedMs / 1000),
        totalSeconds: Math.floor(totalElapsedMs / 1000),
      },
      cards: {
        total: totalCards,
        open: totalCards - closedCards,
        closed: closedCards,
        completionPercentage: totalCards > 0 ? (closedCards / totalCards) * 100 : 0
      },
      columns: columnStats
    });
  } catch (error) {
    console.error('Project stats error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
