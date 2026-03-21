import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const milk = await prisma.product.create({
    data: {
      name: 'Whole Milk',
      brand: 'Publix',
      prices: {
        create: [
          { amount: 3.48, store: 'Publix', zipCode: '33954' },
          { amount: 3.22, store: 'Walmart', zipCode: '33954' }
        ]
      }
    }
  });
  console.log('🐾 Hunt successful! Seeded milk prices.');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
