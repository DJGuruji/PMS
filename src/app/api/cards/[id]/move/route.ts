import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { getProjectRole } from '@/lib/project-rbac';
import { z } from 'zod';

const moveSchema = z.object({
  columnId: z.string(),
  order: z.number().int().min(0),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existingCard = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const { columnId, order: newOrder } = await req.json();
    const result = moveSchema.safeParse({ columnId, order: newOrder });

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const role = await getProjectRole(userId, existingCard.projectId);
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify column belongs to the same project
    const targetColumn = await prisma.column.findFirst({
      where: { id: columnId, projectId: existingCard.projectId },
    });

    if (!targetColumn) {
      return NextResponse.json({ error: 'Invalid column target' }, { status: 400 });
    }

    // Enforce card movement mode
    const project = await prisma.project.findUnique({
      where: { id: existingCard.projectId },
      select: { cardMovementMode: true },
    });

    if (project?.cardMovementMode === 'FORWARD_ONLY' && columnId !== existingCard.columnId) {
      const currentColumn = await prisma.column.findUnique({
        where: { id: existingCard.columnId },
        select: { order: true },
      });
      if (currentColumn && targetColumn.order < currentColumn.order) {
        return NextResponse.json({
          error: 'Card movement is restricted to forward direction only in this project.',
        }, { status: 403 });
      }
    }

    const oldColumnId = existingCard.columnId;
    const oldOrder = existingCard.order;

    await prisma.$transaction(async (tx: any) => {
      if (oldColumnId === columnId) {
        // Move within same column
        if (newOrder > oldOrder) {
          // Moving down: Decrement order of items between old and new
          await tx.card.updateMany({
            where: {
              columnId,
              order: { gt: oldOrder, lte: newOrder },
            },
            data: { order: { decrement: 1 } },
          });
        } else if (newOrder < oldOrder) {
          // Moving up: Increment order of items between new and old
          await tx.card.updateMany({
            where: {
              columnId,
              order: { gte: newOrder, lt: oldOrder },
            },
            data: { order: { increment: 1 } },
          });
        }
      } else {
        // Move to different column
        // 1. Shift items in old column up to fill the gap
        await tx.card.updateMany({
          where: {
            columnId: oldColumnId,
            order: { gt: oldOrder },
          },
          data: { order: { decrement: 1 } },
        });

        // 2. Shift items in new column down to make space
        await tx.card.updateMany({
          where: {
            columnId,
            order: { gte: newOrder },
          },
          data: { order: { increment: 1 } },
        });

        // 3. Log the cross-column movement
        await tx.cardMovementLog.create({
          data: {
            cardId,
            fromColumnId: oldColumnId,
            toColumnId: columnId,
            movedById: userId,
          },
        });
      }

      // Update the card itself
      await tx.card.update({
        where: { id: cardId },
        data: {
          columnId,
          order: newOrder,
        },
      });

      // Log in generic audit log
      await tx.auditLog.create({
        data: {
          userId,
          projectId: existingCard.projectId,
          action: 'MOVE',
          entity: 'CARD',
          entityId: cardId,
          details: { 
            from: oldColumnId !== columnId ? oldColumnId : 'SAME_COLUMN',
            to: columnId,
            order: newOrder
          }
        }
      });
    });

    return NextResponse.json({ message: 'Card moved successfully' });
  } catch (error) {
    console.error('Move card error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
