const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: envFile });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEFAULT_CLASSES = [
  { name: 'Mathematics',      description: 'Algebra, Calculus, Statistics' },
  { name: 'Physics',          description: 'Mechanics, Thermodynamics, Optics' },
  { name: 'Chemistry',        description: 'Organic, Inorganic, Physical Chemistry' },
  { name: 'Computer Science', description: 'Algorithms, OS, Networks, Databases' },
  { name: 'Biology',          description: 'Botany, Zoology, Genetics' },
  { name: 'English',          description: 'Grammar, Literature, Writing' },
];

async function main() {
  for (const cls of DEFAULT_CLASSES) {
    await prisma.class.upsert({
      where:  { name: cls.name },
      update: {},
      create: cls,
    });
  }
  console.log('Seeded default classes.');

  // Seed a first admin user if env vars are provided
  const adminEmail    = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName     = process.env.ADMIN_NAME || 'Admin';

  if (adminEmail && adminPassword) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where:  { email: adminEmail },
      update: { role: 'UPLOADER' },
      create: { name: adminName, email: adminEmail, password: hashed, role: 'UPLOADER' },
    });
    console.log(`Admin user seeded: ${adminEmail}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
