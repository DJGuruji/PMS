import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { getProjectRole } from '@/lib/project-rbac';
import { z } from 'zod';

const holdSchema = z.object({
  reason: z.string().min(1, 'Reason is required when placing a card on hold').optional(),
});

export async function POST(
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
      include: { holds: { where: { endedAt: null } } }
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const role = await getProjectRole(userId, card.projectId);
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const result = holdSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const { reason } = result.data;
    const activeHold = card.holds[0];

    // If a reason is passed, we intend to ON_HOLD the card.
    if (reason) {
       if (activeHold) {
         return NextResponse.json({ error: 'Card is already on hold' }, { status: 400 });
       }
       await prisma.cardHold.create({
         data: {
           cardId,
           reason,
         }
       });
       return NextResponse.json({ message: 'Card placed on hold' });
    } else {
       // We intend to Resume/Unhold the card
       if (!activeHold) {
         return NextResponse.json({ error: 'Card is not actively on hold' }, { status: 400 });
       }
       await prisma.cardHold.update({
         where: { cardId_startedAt: { cardId, startedAt: activeHold.startedAt } },
         data: { endedAt: new Date() }
       });
       return NextResponse.json({ message: 'Card resumed' });
    }
  } catch (error) {
    console.error('Toggle hold error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
