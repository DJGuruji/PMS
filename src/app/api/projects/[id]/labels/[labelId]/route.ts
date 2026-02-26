import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { canManageProject } from '@/lib/project-rbac';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  try {
    const { id: projectId, labelId } = await params;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await canManageProject(userId, projectId))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Verify label belongs to the project
    const label = await prisma.label.findFirst({
      where: { id: labelId, projectId },
    });
    if (!label) return NextResponse.json({ error: 'Label not found' }, { status: 404 });

    await prisma.label.delete({ where: { id: labelId } });

    return NextResponse.json({ message: 'Label deleted' });
  } catch (error) {
    console.error('Delete label error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
