import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRoleIn, getUserId } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { serializeBigInt } from '@/lib/serializer';

const projectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  organizationId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // ADMIN and SUB_ADMIN can create projects
    const rbacError = checkRoleIn(req, [Role.ADMIN, Role.SUB_ADMIN]);
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

    const { name, description, organizationId } = result.data;

    const project = await prisma.$transaction(async (tx) => {
      // Create project
      const newProject = await tx.project.create({
        data: {
          name,
          description,
          creatorId: userId,
          organizationId: organizationId || null,
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

    return NextResponse.json(serializeBigInt(project), { status: 201 });
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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const orgId = searchParams.get('orgId');

    let whereClause: any = {};
    
    if (orgId) {
      if (userRole !== Role.ADMIN) {
        // Enforce that user is at least part of the organization to see its projects
        const isOrgMember = await prisma.organizationMembership.findUnique({
          where: { userId_orgId: { userId, orgId } }
        });
        if (!isOrgMember) {
           return NextResponse.json({ error: 'Access denied to organization' }, { status: 403 });
        }
      }
      // Return ALL projects in this org
      whereClause.organizationId = orgId;
    } else {
      // No orgId provided (e.g., getting all user projects)
      if (userRole !== Role.ADMIN) {
        whereClause = {
          members: {
            some: { userId }
          }
        };
      }
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { members: true, cards: true }
          },
          members: {
            where: { userId }
          }
        },
        skip,
        take: limit,
      }),
      prisma.project.count({ where: whereClause })
    ]);

    return NextResponse.json({
      projects: projects.map(p => ({
        ...serializeBigInt(p),
        isJoined: p.members.length > 0
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Fetch projects error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
