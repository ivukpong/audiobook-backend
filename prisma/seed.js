"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = require("argon2");
const prisma = new client_1.PrismaClient();
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
            role: client_1.Role.ADMIN,
        },
    });
    console.log('✓ Admin user:', admin.email);
    const buyer = await prisma.user.create({
        data: {
            email: 'buyer@audora.ng',
            name: 'Audora Buyer',
            passwordHash: buyerHash,
            role: client_1.Role.BUYER,
        },
    });
    console.log('✓ Buyer user:', buyer.email);
    const booksToSeed = [
        {
            title: 'Deep Work',
            author: 'Cal Newport',
            description: 'Rules for focused success in a distracted world. Learn how to achieve more in less time by mastering the art of deep focus.',
            coverStorageKey: '',
            price: 4500,
            currency: 'NGN',
            durationSec: 21600,
            mediaStorageKey: 'audora/media/deep-work-sample',
            published: true,
            featured: true,
        },
        {
            title: 'Atomic Habits',
            author: 'James Clear',
            description: 'Tiny changes, remarkable results. An easy and proven way to build good habits and break bad ones.',
            coverStorageKey: '',
            price: 3800,
            currency: 'NGN',
            durationSec: 19080,
            mediaStorageKey: 'audora/media/atomic-habits-sample',
            published: true,
            featured: true,
        },
        {
            title: 'Zero to One',
            author: 'Peter Thiel',
            description: 'Notes on startups, or how to build the future. Peter Thiel shares the contrarian thinking that drives successful ventures.',
            coverStorageKey: '',
            price: 3500,
            currency: 'NGN',
            durationSec: 14400,
            mediaStorageKey: 'audora/media/zero-to-one-sample',
            published: true,
            featured: false,
        },
    ];
    const seededBooks = [];
    for (const bookData of booksToSeed) {
        const created = await prisma.book.create({
            data: bookData,
            select: { id: true, title: true, price: true, currency: true },
        });
        seededBooks.push(created);
    }
    console.log(`✓ Seeded/updated ${seededBooks.length} books`);
    const buyerBooks = seededBooks.filter((book) => ['Deep Work', 'Atomic Habits'].includes(book.title));
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
//# sourceMappingURL=seed.js.map