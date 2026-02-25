import { PrismaClient, Role, CardStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Skipping seed: NODE_ENV is set to production.');
    return;
  }

  console.log('Seeding database...');

  // 1. Create Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pms.com' },
    update: {},
    create: {
      email: 'admin@pms.com',
      name: 'System Admin',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'user@pms.com' },
    update: {},
    create: {
      email: 'user@pms.com',
      name: 'Standard User',
      password: userPassword,
      role: Role.MEMBER,
    },
  });

  // 2. Create Project
  const project = await prisma.project.create({
    data: {
      name: 'Default Kanban Board',
      description: 'Main project for task management',
      creatorId: admin.id,
      members: {
        createMany: {
          data: [
            { userId: admin.id, role: Role.ADMIN },
            { userId: member.id, role: Role.MEMBER },
          ],
        },
      },
    },
  });

  // 3. Create Columns
  const columns = await Promise.all([
    prisma.column.create({
      data: { name: 'To Do', order: 1, projectId: project.id },
    }),
    prisma.column.create({
      data: { name: 'In Progress', order: 2, projectId: project.id },
    }),
    prisma.column.create({
      data: { name: 'Done', order: 3, projectId: project.id },
    }),
  ]);

  // 4. Create Priorities
  const priorities = await Promise.all([
    prisma.priority.create({
      data: { name: 'High', weight: 3, projectId: project.id },
    }),
    prisma.priority.create({
      data: { name: 'Medium', weight: 2, projectId: project.id },
    }),
    prisma.priority.create({
      data: { name: 'Low', weight: 1, projectId: project.id },
    }),
  ]);

  // 5. Create Labels
  const labels = await Promise.all([
    prisma.label.create({
      data: { name: 'Bug', color: '#ef4444', projectId: project.id },
    }),
    prisma.label.create({
      data: { name: 'Feature', color: '#3b82f6', projectId: project.id },
    }),
    prisma.label.create({
      data: { name: 'Refactor', color: '#10b981', projectId: project.id },
    }),
  ]);

  // 6. Create Cards
  await prisma.card.create({
    data: {
      name: 'Initial Setup',
      description: 'Complete the repository and DB setup',
      status: CardStatus.CLOSED,
      order: 1,
      projectId: project.id,
      columnId: columns[2].id, // Done
      assigneeId: admin.id,
      priorityId: priorities[0].id,
      labels: { connect: [{ id: labels[1].id }] },
      closedAt: new Date(),
    },
  });

  await prisma.card.create({
    data: {
      name: 'Implement Auth',
      description: 'Setup JWT and Refresh tokens',
      status: CardStatus.OPEN,
      order: 1,
      projectId: project.id,
      columnId: columns[1].id, // In Progress
      assigneeId: member.id,
      priorityId: priorities[0].id,
      labels: { connect: [{ id: labels[2].id }] },
    },
  });

  await prisma.card.create({
    data: {
      name: 'Design Admin Panel',
      description: 'Create the project management UI',
      status: CardStatus.OPEN,
      order: 1,
      projectId: project.id,
      columnId: columns[0].id, // To Do
      priorityId: priorities[1].id,
      labels: { connect: [{ id: labels[1].id }] },
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
