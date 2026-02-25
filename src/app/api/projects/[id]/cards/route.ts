import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { getProjectRole } from '@/lib/project-rbac';
import { z } from 'zod';

const cardSchema = z.object({
  name: z.string().min(1, 'Card name is required'),
  description: z.string().optional(),
  columnId: z.string(),
  assigneeId: z.string().optional(),
  priorityId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = await getProjectRole(userId, projectId);
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const result = cardSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const { name, description, columnId, assigneeId, priorityId, labelIds } = result.data;

    // Verify column belongs to project
    const column = await prisma.column.findFirst({
      where: { id: columnId, projectId },
    });

    if (!column) {
      return NextResponse.json({ error: 'Invalid column for this project' }, { status: 400 });
    }

    // Get the highest order in the column to place card at the bottom
    const lastCard = await prisma.card.findFirst({
      where: { columnId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newOrder = (lastCard?.order ?? 0) + 1;

    const card = await prisma.card.create({
      data: {
        name,
        description,
        columnId,
        projectId,
        assigneeId,
        priorityId,
        order: newOrder,
        labels: labelIds ? {
          connect: labelIds.map(id => ({ id })),
        } : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        priority: true,
        labels: true,
      }
    });

    // Log the initial movement (creation)
    await prisma.cardMovementLog.create({
      data: {
        cardId: card.id,
        toColumnId: columnId,
        movedById: userId,
      }
    });

    // Log in audit log
    await prisma.auditLog.create({
      data: {
        userId,
        projectId,
        action: 'CREATE',
        entity: 'CARD',
        entityId: card.id,
        details: { name: card.name, column: column.name }
      }
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Create card error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
