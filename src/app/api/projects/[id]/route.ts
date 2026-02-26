import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/rbac';
import { getProjectRole, canManageProject } from '@/lib/project-rbac';
import { serializeBigInt } from '@/lib/serializer';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = await getProjectRole(userId, projectId);
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: { members: true, cards: true, columns: true }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(serializeBigInt(project));
  } catch (error) {
    console.error('Fetch project error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await canManageProject(userId, projectId))) {
      return NextResponse.json(
        { error: 'Only project admins can delete a project' },
        { status: 403 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Cascading delete handled by Prisma schema (onDelete: Cascade on all child relations)
    await prisma.project.delete({ where: { id: projectId } });

    return NextResponse.json({ message: `Project "${project.name}" deleted successfully` });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
