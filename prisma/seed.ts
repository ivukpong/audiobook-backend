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
  const buyerHash = await argon2.hash('Buyer@1234');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@audora.ng',
      name: 'Audora Admin',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  console.log('✓ Admin user:', admin.email);

  const buyer = await prisma.user.create({
    data: {
      email: 'buyer@audora.ng',
      name: 'Audora Buyer',
      passwordHash: buyerHash,
      role: Role.BUYER,
    },
  });

  console.log('✓ Buyer user:', buyer.email);

  const booksToSeed: Array<{
    title: string;
    author: string;
    description: string;
    coverStorageKey: string;
    price: number;
    currency: string;
    durationSec: number;
    mediaStorageKey: string;
    published: boolean;
    featured: boolean;
    spotifyUrl?: string;
    appleBooksUrl?: string;
    findawayUrl?: string;
  }> = [
    {
      title: 'Deep Work',
      author: 'Cal Newport',
      description:
        'Rules for focused success in a distracted world. Learn how to achieve more in less time by mastering the art of deep focus.',
      coverStorageKey: 'audora/covers/deep-work',
      price: 4500,
      currency: 'NGN',
      durationSec: 21600,
      mediaStorageKey: 'audora/media/deep-work-sample',
      published: true,
      featured: true,
      spotifyUrl: 'https://open.spotify.com/show/example',
      appleBooksUrl: 'https://books.apple.com/example',
      findawayUrl: 'https://buy.findawayvoices.com/deep-work',
    },
    {
      title: 'Atomic Habits',
      author: 'James Clear',
      description:
        'Tiny changes, remarkable results. An easy and proven way to build good habits and break bad ones.',
      coverStorageKey: 'audora/covers/atomic-habits',
      price: 3800,
      currency: 'NGN',
      durationSec: 19080,
      mediaStorageKey: 'audora/media/atomic-habits-sample',
      published: true,
      featured: true,
      spotifyUrl: 'https://open.spotify.com/show/example2',
      appleBooksUrl: 'https://books.apple.com/example2',
      findawayUrl: 'https://buy.findawayvoices.com/atomic-habits',
    },
    {
      title: 'Zero to One',
      author: 'Peter Thiel',
      description:
        'Notes on startups, or how to build the future. Peter Thiel shares the contrarian thinking that drives successful ventures.',
      coverStorageKey: 'audora/covers/zero-to-one',
      price: 3500,
      currency: 'NGN',
      durationSec: 14400,
      mediaStorageKey: 'audora/media/zero-to-one-sample',
      published: true,
      featured: false,
      findawayUrl: 'https://buy.findawayvoices.com/zero-to-one',
    },
  ];

  const seededBooks: Array<{ id: string; title: string; price: number; currency: string }> = [];

  for (const bookData of booksToSeed) {
    const created = await prisma.book.create({
      data: bookData,
      select: { id: true, title: true, price: true, currency: true },
    });
    seededBooks.push(created);
  }

  console.log(`✓ Seeded/updated ${seededBooks.length} books`);

  const buyerBooks = seededBooks.filter((book) =>
    ['Deep Work', 'Atomic Habits'].includes(book.title),
  );

  for (let index = 0; index < buyerBooks.length; index += 1) {
    const book = buyerBooks[index];
    await prisma.purchase.create({
      data: {
        userId: buyer.id,
        bookId: book.id,
        amountPaid: book.price,
        currency: book.currency,
        paystackRef: `seed-${book.title.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`,
        status: 'COMPLETED',
      },
    });
  }

  console.log(`✓ Granted ${buyerBooks.length} purchased book(s) to ${buyer.email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
