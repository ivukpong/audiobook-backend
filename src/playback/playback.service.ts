import { Injectable, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { Readable } from 'stream';
import { PrismaService } from '../common/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PurchasesService } from '../purchases/purchases.service';

@Injectable()
export class PlaybackService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private purchases: PurchasesService,
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

  async getDownloadStream(userId: string, bookId: string, deviceId: string) {
    const owned = await this.purchases.hasPurchased(userId, bookId);
    if (!owned) throw new ForbiddenException('Purchase this book to download');

    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { title: true, mediaStorageKey: true },
    });

    if (!book?.mediaStorageKey) {
      throw new InternalServerErrorException('Audio file is not available');
    }

    const signedUrl = await this.storage.getSignedUrl(book.mediaStorageKey);
    const upstream = await fetch(signedUrl);

    if (!upstream.ok || !upstream.body) {
      throw new InternalServerErrorException('Failed to fetch audio file');
    }

    await this.prisma.playbackSession.upsert({
      where: { userId_bookId_deviceId: { userId, bookId, deviceId } },
      create: { userId, bookId, deviceId, lastActiveAt: new Date() },
      update: { lastActiveAt: new Date() },
    });

    const safeTitle = (book.title || 'audiobook')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80);

    return {
      stream: Readable.fromWeb(upstream.body as any),
      filename: `${safeTitle || 'audiobook'}.mp3`,
      mimeType: upstream.headers.get('content-type') || 'audio/mpeg',
    };
  }
}
