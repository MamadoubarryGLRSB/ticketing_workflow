import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin@gmail.com';

async function main() {
  const roleAdmin = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    create: { name: 'ADMIN' },
    update: {},
  });
  await prisma.role.upsert({
    where: { name: 'USER' },
    create: { name: 'USER' },
    update: {},
  });

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      password: hash,
      name: 'Admin',
    },
    update: {},
    select: { id: true },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roleAdmin.id } },
    create: { userId: admin.id, roleId: roleAdmin.id },
    update: {},
  });

  console.log('Seed OK: rôles ADMIN et USER créés.');
  console.log(`Compte admin : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (à changer en prod).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
