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
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        movementLogs: {
          orderBy: { movedAt: 'asc' },
          include: {
            fromColumn: true,
            toColumn: true,
          }
        },
        column: true, // Current column
      }
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const role = await getProjectRole(userId, card.projectId);
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Logic for time tracking
    const timeline = [];
    const logs = card.movementLogs;
    
    // Initial column (from creation till first move or now)
    // The very first column is where it was created
    // We can infer the initial column from the first log's 'fromColumnId' (which is null for the first log if we logged it on creation)
    // In our POST /cards, we log with toColumnId and fromColumnId null.
    
    let lastTime = new Date(card.createdAt).getTime();
    
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const moveTime = new Date(log.movedAt).getTime();
        const durationMs = moveTime - lastTime;
        
        // This log represents moving INTO 'toColumn'
        // So the time spent was in the PREVIOUS column (which is 'fromColumn')
        // Unless it's the very first log (creation), where 'fromColumn' is null.
        
        timeline.push({
            columnId: log.fromColumnId || 'Initial',
            columnName: log.fromColumn?.name || 'Creation',
            enteredAt: new Date(lastTime),
            leftAt: new Date(moveTime),
            durationMs: durationMs,
            durationSeconds: Math.floor(durationMs / 1000)
        });
        
        lastTime = moveTime;
    }
    
    // Add time spent in current column
    const endTime = card.closedAt ? new Date(card.closedAt).getTime() : Date.now();
    const currentDurationMs = endTime - lastTime;
    
    timeline.push({
        columnId: card.columnId,
        columnName: card.column.name,
        enteredAt: new Date(lastTime),
        leftAt: card.closedAt ? new Date(card.closedAt) : null,
        durationMs: currentDurationMs,
        durationSeconds: Math.floor(currentDurationMs / 1000),
        isCurrent: !card.closedAt
    });

    const totalTimeMs = timeline.reduce((acc, curr) => acc + curr.durationMs, 0);

    return NextResponse.json({
        cardId: card.id,
        cardName: card.name,
        totalTimeMs,
        totalTimeSeconds: Math.floor(totalTimeMs / 1000),
        timeline
    });
  } catch (error) {
    console.error('Timeline error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
