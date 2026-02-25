import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { canManageProject } from '@/lib/project-rbac';
import { z } from 'zod';

const updateColumnSchema = z.object({
  name: z.string().min(1).optional(),
  order: z.number().int().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const columnId = params.id;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const column = await prisma.column.findUnique({
      where: { id: columnId },
    });

    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }

    if (!(await canManageProject(userId, column.projectId))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const result = updateColumnSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const updatedColumn = await prisma.column.update({
      where: { id: columnId },
      data: result.data,
    });

    return NextResponse.json(updatedColumn);
  } catch (error) {
    console.error('Update column error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const columnId = params.id;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { cards: true }
    });

    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }

    if (!(await canManageProject(userId, column.projectId))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (column.cards.length > 0) {
      return NextResponse.json({ error: 'Cannot delete a column that contains cards' }, { status: 400 });
    }

    await prisma.column.delete({
      where: { id: columnId },
    });

    return NextResponse.json({ message: 'Column deleted successfully' });
  } catch (error) {
    console.error('Delete column error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
