import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma = new PrismaClient({ adapter } as any);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@zextjv.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234';
  const name = process.env.SEED_ADMIN_NAME ?? 'ZEXT Administrator';

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isActive: true, failedAttempts: 0, lockedUntil: null },
    create: {
      name,
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log(`\n✅ Super Admin seeded:`);
  console.log(`   ID:    ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Pass:  ${password}  ← CHANGE THIS IN PRODUCTION\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
