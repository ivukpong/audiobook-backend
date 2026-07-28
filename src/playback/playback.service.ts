import { Injectable, ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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

  private get db(): any {
    return this.prisma as any;
  }

  private async resolveChapterOrLegacyMedia(bookId: string, chapterId?: string) {
    const book = await this.db.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        mediaStorageKey: true,
        chapters: {
          select: { id: true, title: true, chapterOrder: true, mediaStorageKey: true, durationSec: true },
          orderBy: { chapterOrder: 'asc' },
        },
      },
    });

    if (!book) throw new NotFoundException('Book not found');

    const hasChapters = book.chapters.length > 0;
    if (!hasChapters) {
      if (!book.mediaStorageKey) throw new InternalServerErrorException('Audio file is not available');
      return {
        book,
        chapter: {
          id: `${book.id}-legacy-main`,
          title: 'Full Book',
          chapterOrder: 0,
          mediaStorageKey: book.mediaStorageKey,
          durationSec: 0,
        },
      };
    }

    if (chapterId) {
      const selected = book.chapters.find((chapter) => chapter.id === chapterId);
      if (!selected) throw new NotFoundException('Chapter not found for this book');
      return { book, chapter: selected };
    }

    return { book, chapter: book.chapters[0] };
  }

  async getStreamUrl(userId: string, bookId: string, deviceId: string, chapterId?: string) {
    const owned = await this.purchases.hasPurchased(userId, bookId);
    if (!owned) throw new ForbiddenException('Purchase this book to listen');

    const { chapter } = await this.resolveChapterOrLegacyMedia(bookId, chapterId);
    const signedUrl = await this.storage.getSignedUrl(chapter.mediaStorageKey);

    await this.db.playbackSession.upsert({
      where: { userId_bookId_deviceId: { userId, bookId, deviceId } },
      create: {
        userId,
        bookId,
        deviceId,
        chapterOrder: chapter.chapterOrder,
        chapterProgressSec: 0,
        lastActiveAt: new Date(),
      },
      update: { chapterOrder: chapter.chapterOrder, lastActiveAt: new Date() },
    });

    return {
      url: signedUrl,
      chapter: {
        id: chapter.id,
        title: chapter.title,
        order: chapter.chapterOrder,
        durationSec: chapter.durationSec,
      },
    };
  }

  async saveProgress(
    userId: string,
    bookId: string,
    deviceId: string,
    progressSec: number,
    chapterOrder?: number,
    chapterProgressSec?: number,
  ) {
    const safeProgress = Math.max(0, Math.floor(Number(progressSec || 0)));
    const safeChapterOrder = Math.max(0, Math.floor(Number(chapterOrder || 0)));
    const safeChapterProgress = Math.max(0, Math.floor(Number(chapterProgressSec ?? safeProgress)));

    return this.db.playbackSession.updateMany({
      where: { userId, bookId, deviceId },
      data: {
        progressSec: safeProgress,
        chapterOrder: safeChapterOrder,
        chapterProgressSec: safeChapterProgress,
        lastActiveAt: new Date(),
      },
    });
  }

  async getProgress(userId: string, bookId: string, deviceId: string) {
    const session = await this.db.playbackSession.findUnique({
      where: { userId_bookId_deviceId: { userId, bookId, deviceId } },
    });
    return {
      progressSec: session?.progressSec ?? 0,
      chapterOrder: session?.chapterOrder ?? 0,
      chapterProgressSec: session?.chapterProgressSec ?? 0,
    };
  }

  async getDownloadStream(userId: string, bookId: string, deviceId: string, chapterId?: string) {
    const owned = await this.purchases.hasPurchased(userId, bookId);
    if (!owned) throw new ForbiddenException('Purchase this book to download');

    const { book, chapter } = await this.resolveChapterOrLegacyMedia(bookId, chapterId);

    const signedUrl = await this.storage.getSignedUrl(chapter.mediaStorageKey);
    const upstream = await fetch(signedUrl);

    if (!upstream.ok || !upstream.body) {
      throw new InternalServerErrorException('Failed to fetch audio file');
    }

    await this.db.playbackSession.upsert({
      where: { userId_bookId_deviceId: { userId, bookId, deviceId } },
      create: {
        userId,
        bookId,
        deviceId,
        chapterOrder: chapter.chapterOrder,
        chapterProgressSec: 0,
        lastActiveAt: new Date(),
      },
      update: { chapterOrder: chapter.chapterOrder, lastActiveAt: new Date() },
    });

    const safeTitle = (book.title || 'audiobook')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80);

    const safeChapter = (chapter.title || `chapter_${chapter.chapterOrder + 1}`)
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 50);

    return {
      stream: Readable.fromWeb(upstream.body as any),
      filename: `${safeTitle || 'audiobook'}-${safeChapter || `chapter_${chapter.chapterOrder + 1}`}.mp3`,
      mimeType: upstream.headers.get('content-type') || 'audio/mpeg',
    };
  }
}
