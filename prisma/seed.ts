import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const workflow = await prisma.workflow.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Support',
      description: 'Workflow par défaut pour les tickets support',
    },
    update: {},
  });

  const existingStates = await prisma.state.count({ where: { workflowId: workflow.id } });
  if (existingStates === 0) {
    await prisma.state.createMany({
      data: [
        { name: 'Ouvert', order: 0, workflowId: workflow.id },
        { name: 'En cours', order: 1, workflowId: workflow.id },
        { name: 'Résolu', order: 2, workflowId: workflow.id },
        { name: 'Fermé', order: 3, workflowId: workflow.id },
      ],
    });
  }

  console.log('Seed OK: workflow "Support" avec états Ouvert, En cours, Résolu, Fermé.');
  console.log('workflowId pour créer un ticket:', workflow.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
