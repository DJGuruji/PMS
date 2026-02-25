import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRole, getUserId } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Only global Admins can create projects
    const rbacError = checkRole(req, Role.ADMIN);
    if (rbacError) return rbacError;

    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'User ID missing' }, { status: 401 });
    }

    const body = await req.json();
    const result = projectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      );
    }

    const { name, description } = result.data;

    const project = await prisma.$transaction(async (tx) => {
      // Create project
      const newProject = await tx.project.create({
        data: {
          name,
          description,
          creatorId: userId,
        },
      });

      // Automatically add creator as Admin member of the project
      await tx.projectMembership.create({
        data: {
          userId,
          projectId: newProject.id,
          role: Role.ADMIN,
        },
      });

      // Create default columns for the new project
      const defaultColumns = ['To Do', 'In Progress', 'Done'];
      await tx.column.createMany({
        data: defaultColumns.map((colName, index) => ({
          name: colName,
          order: index + 1,
          projectId: newProject.id,
        })),
      });

      return newProject;
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = req.headers.get('x-user-role');

    let projects;

    if (userRole === Role.ADMIN) {
      // Global Admins see everything
      projects = await prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { members: true, cards: true }
          }
        }
      });
    } else {
      // Members only see projects they belong to
      projects = await prisma.project.findMany({
        where: {
          members: {
            some: { userId }
          }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { members: true, cards: true }
          }
        }
      });
    }

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Fetch projects error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
