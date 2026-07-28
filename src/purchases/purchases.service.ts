import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PaystackService } from '../paystack/paystack.service';
import { BooksService } from '../books/books.service';
import { StorageService } from '../storage/storage.service';
import { InitPurchaseDto } from './dto/init-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
    private books: BooksService,
    private storage: StorageService,
  ) {}

  async initiate(userId: string, userEmail: string, dto: InitPurchaseDto) {
    const book = await this.books.findOne(dto.bookId);
    const already = await this.prisma.purchase.findUnique({
      where: { userId_bookId: { userId, bookId: dto.bookId } },
    });
    if (already?.status === 'COMPLETED') throw new BadRequestException('You already own this book');

    const amountKobo = Math.round(book.price * 100);
    const tx = await this.paystack.initializeTransaction(
      userEmail, amountKobo, dto.bookId, userId, dto.callbackUrl,
    );

    await this.prisma.purchase.upsert({
      where: { userId_bookId: { userId, bookId: dto.bookId } },
      create: { userId, bookId: dto.bookId, amountPaid: book.price, currency: book.currency, paystackRef: tx.reference, status: 'PENDING' },
      update: { paystackRef: tx.reference, status: 'PENDING' },
    });

    return { authorizationUrl: tx.authorization_url, reference: tx.reference };
  }

  async handleWebhook(rawBody: string, signature: string) {
    if (!this.paystack.validateWebhook(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }
    const event = JSON.parse(rawBody);
    if (event.event === 'charge.success') {
      const ref = event.data.reference;
      await this.prisma.purchase.update({
        where: { paystackRef: ref },
        data: { status: 'COMPLETED' },
      });
    }
    return { received: true };
  }

  async verifyAndComplete(reference: string) {
    const tx = await this.paystack.verifyTransaction(reference);
    if (tx.status !== 'success') throw new BadRequestException('Payment not successful');
    const purchase = await this.prisma.purchase.update({
      where: { paystackRef: reference },
      data: { status: 'COMPLETED' },
      include: { book: { select: { id: true, title: true } } },
    });
    return purchase;
  }

  async getUserLibrary(userId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { userId, status: 'COMPLETED' },
      include: { book: { select: { id: true, title: true, author: true, coverStorageKey: true, durationSec: true, currency: true, price: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return purchases.map((purchase) => ({
      ...purchase,
      book: {
        ...purchase.book,
        coverUrl: purchase.book.coverStorageKey
          ? this.storage.getPublicUrl(purchase.book.coverStorageKey)
          : null,
      },
    }));
  }

  async hasPurchased(userId: string, bookId: string): Promise<boolean> {
    const p = await this.prisma.purchase.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
    return p?.status === 'COMPLETED';
  }
}
