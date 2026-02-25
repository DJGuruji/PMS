import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { getProjectRole } from '@/lib/project-rbac';
import { z } from 'zod';

const updateCardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  assigneeId: z.string().nullable().optional(),
  priorityId: z.string().nullable().optional(),
  labelIds: z.array(z.string()).optional(),
});

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
        assignee: { select: { id: true, name: true, email: true } },
        priority: true,
        labels: true,
      }
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const role = await getProjectRole(userId, card.projectId);
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(card);
  } catch (error) {
    console.error('Get card error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

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

    const role = await getProjectRole(userId, existingCard.projectId);
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const result = updateCardSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const { labelIds, ...updateData } = result.data;

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...updateData,
        closedAt: updateData.status === 'CLOSED' ? new Date() : (updateData.status === 'OPEN' ? null : undefined),
        labels: labelIds ? {
          set: labelIds.map(id => ({ id })),
        } : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        priority: true,
        labels: true,
      }
    });

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error('Update card error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(
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

    const role = await getProjectRole(userId, existingCard.projectId);
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.card.delete({
      where: { id: cardId },
    });

    return NextResponse.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Delete card error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
