import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { canManageProject } from '@/lib/project-rbac';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; priorityId: string }> }
) {
  try {
    const { id: projectId, priorityId } = await params;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await canManageProject(userId, projectId))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Verify priority belongs to the project
    const priority = await prisma.priority.findFirst({
      where: { id: priorityId, projectId },
    });
    if (!priority) return NextResponse.json({ error: 'Priority not found' }, { status: 404 });

    // Null out cards that used this priority before deleting
    await prisma.card.updateMany({
      where: { priorityId, projectId },
      data: { priorityId: null },
    });

    await prisma.priority.delete({ where: { id: priorityId } });

    return NextResponse.json({ message: 'Priority deleted' });
  } catch (error) {
    console.error('Delete priority error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
