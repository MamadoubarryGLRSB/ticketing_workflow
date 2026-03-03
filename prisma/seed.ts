import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.role.upsert({
    where: { name: 'ADMIN' },
    create: { name: 'ADMIN' },
    update: {},
  });
  await prisma.role.upsert({
    where: { name: 'USER' },
    create: { name: 'USER' },
    update: {},
  });

  console.log('Seed OK: rôles ADMIN et USER créés. Créez les workflows via l’API (POST /workflows).');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
