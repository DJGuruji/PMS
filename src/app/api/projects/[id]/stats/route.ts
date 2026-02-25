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

    const cards = await prisma.card.findMany({
      where: { projectId },
      select: { createdAt: true, closedAt: true, status: true }
    });

    if (cards.length === 0) {
      return NextResponse.json({
        message: 'No cards in project yet',
        stats: null
      });
    }

    const firstCard = await prisma.card.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true }
    });

    const isAllClosed = cards.every((c: any) => c.status === 'CLOSED');
    let projectEndTime = null;

    if (isAllClosed) {
      const lastClosed = await prisma.card.findFirst({
        where: { projectId },
        orderBy: { closedAt: 'desc' },
        select: { closedAt: true }
      });
      projectEndTime = lastClosed?.closedAt;
    }

    const totalCards = cards.length;
    const closedCards = cards.filter((c: any) => c.status === 'CLOSED').length;
    const openCards = totalCards - closedCards;

    return NextResponse.json({
      projectId,
      stats: {
        startTime: firstCard?.createdAt,
        endTime: projectEndTime,
        isCompleted: isAllClosed,
        totalCards,
        openCards,
        closedCards,
        completionPercentage: totalCards > 0 ? (closedCards / totalCards) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Project stats error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
