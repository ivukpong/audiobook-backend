import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  await prisma.playbackSession.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();
  console.log('✓ Cleared existing database data');

  const adminHash = await argon2.hash('Admin@1234');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@audora.ng',
      name: 'Audora Admin',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  console.log('✓ Admin user:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
