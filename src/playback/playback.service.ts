import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PurchasesService } from '../purchases/purchases.service';
import { BooksService } from '../books/books.service';

@Injectable()
export class PlaybackService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private purchases: PurchasesService,
    private books: BooksService,
  ) {}

  async getStreamUrl(userId: string, bookId: string, deviceId: string) {
    const owned = await this.purchases.hasPurchased(userId, bookId);
    if (!owned) throw new ForbiddenException('Purchase this book to listen');

    const book = await this.prisma.book.findUnique({ where: { id: bookId }, select: { mediaStorageKey: true } });
    const signedUrl = await this.storage.getSignedUrl(book.mediaStorageKey);

    await this.prisma.playbackSession.upsert({
      where: { userId_bookId_deviceId: { userId, bookId, deviceId } },
      create: { userId, bookId, deviceId, lastActiveAt: new Date() },
      update: { lastActiveAt: new Date() },
    });

    return { url: signedUrl };
  }

  async saveProgress(userId: string, bookId: string, deviceId: string, progressSec: number) {
    return this.prisma.playbackSession.updateMany({
      where: { userId, bookId, deviceId },
      data: { progressSec, lastActiveAt: new Date() },
    });
  }

  async getProgress(userId: string, bookId: string, deviceId: string) {
    const session = await this.prisma.playbackSession.findUnique({
      where: { userId_bookId_deviceId: { userId, bookId, deviceId } },
    });
    return { progressSec: session?.progressSec ?? 0 };
  }
}
