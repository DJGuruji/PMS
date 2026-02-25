import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { getProjectRole } from '@/lib/project-rbac';

export async function GET(
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

    const board = await prisma.column.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        cards: {
          where: { status: 'OPEN' },
          orderBy: { order: 'asc' },
          include: {
            assignee: {
              select: { id: true, name: true, email: true }
            },
            priority: true,
            labels: true,
          }
        }
      }
    });

    return NextResponse.json(board);
  } catch (error) {
    console.error('Fetch board error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
