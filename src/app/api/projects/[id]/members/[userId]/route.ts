import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { canManageProject } from '@/lib/project-rbac';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: projectId, userId: targetUserId } = await params;
    const currentUserId = getUserId(req);
    if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await canManageProject(currentUserId, projectId))) {
      return NextResponse.json({ error: 'Only admins can manage members' }, { status: 403 });
    }

    const membership = await prisma.projectMembership.findUnique({
      where: { userId_projectId: { userId: targetUserId, projectId } }
    });

    if (!membership) {
      return NextResponse.json({ error: 'User is not a member of this project' }, { status: 404 });
    }

    await prisma.projectMembership.delete({
      where: { userId_projectId: { userId: targetUserId, projectId } }
    });

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Delete project member error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
