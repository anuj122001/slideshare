const { PrismaClient } = require('@prisma/client');

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
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
