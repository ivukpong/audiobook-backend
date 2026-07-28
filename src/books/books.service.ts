import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateBookChapterDto, CreateBookDto } from './dto/create-book.dto';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  private isChapterSchemaError(error: any) {
    const message = String(error?.message || '').toLowerCase();
    return (
      error?.code === 'P2021'
      || message.includes('book_chapters')
      || message.includes('unknown field') && message.includes('chapters')
    );
  }

  private normalizeChapters(chapters?: CreateBookChapterDto[]) {
    if (!chapters?.length) return [];

    return chapters
      .map((chapter, index) => ({
        title: chapter.title?.trim() || `Chapter ${index + 1}`,
        mediaStorageKey: chapter.mediaStorageKey?.trim(),
        durationSec: Math.max(0, Math.floor(Number(chapter.durationSec || 0))),
        chapterOrder: index,
      }))
      .filter((chapter) => Boolean(chapter.mediaStorageKey));
  }

  private mapBookForClient(book: any, includeStorageKeys = false) {
    const chapters = (book.chapters || [])
      .sort((a: any, b: any) => a.chapterOrder - b.chapterOrder)
      .map((chapter: any) => ({
        id: chapter.id,
        title: chapter.title,
        order: chapter.chapterOrder,
        durationSec: chapter.durationSec,
        ...(includeStorageKeys ? { mediaStorageKey: chapter.mediaStorageKey } : {}),
      }));

    const fallbackChapter =
      chapters.length === 0 && book.mediaStorageKey
        ? [
            {
              id: `${book.id}-legacy-main`,
              title: 'Full Book',
              order: 0,
              durationSec: book.durationSec || 0,
              ...(includeStorageKeys ? { mediaStorageKey: book.mediaStorageKey } : {}),
            },
          ]
        : [];

    const chapterList = chapters.length > 0 ? chapters : fallbackChapter;

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      price: book.price,
      currency: book.currency,
      durationSec: book.durationSec,
      featured: book.featured,
      published: book.published,
      spotifyUrl: book.spotifyUrl,
      appleBooksUrl: book.appleBooksUrl,
      googlePlayUrl: book.googlePlayUrl,
      audibleUrl: book.audibleUrl,
      findawayUrl: book.findawayUrl,
      createdAt: book.createdAt,
      coverUrl: book.coverStorageKey ? this.storage.getPublicUrl(book.coverStorageKey) : null,
      chapterCount: chapterList.length,
      chapters: chapterList,
      ...(includeStorageKeys
        ? {
            coverStorageKey: book.coverStorageKey,
            mediaStorageKey: book.mediaStorageKey,
          }
        : {}),
    };
  }

  async findAll(publishedOnly = true, includeStorageKeys = false) {
    let books: any[] = [];
    try {
      books = await (this.prisma as any).book.findMany({
        where: publishedOnly ? { published: true } : {},
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          author: true,
          description: true,
          coverStorageKey: true,
          mediaStorageKey: true,
          price: true,
          currency: true,
          durationSec: true,
          featured: true,
          published: true,
          spotifyUrl: true,
          appleBooksUrl: true,
          googlePlayUrl: true,
          audibleUrl: true,
          findawayUrl: true,
          createdAt: true,
          chapters: {
            select: { id: true, title: true, chapterOrder: true, durationSec: true, mediaStorageKey: true },
            orderBy: { chapterOrder: 'asc' },
          },
        },
      });
    } catch (error) {
      if (!this.isChapterSchemaError(error)) throw error;

      books = await (this.prisma as any).book.findMany({
        where: publishedOnly ? { published: true } : {},
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          author: true,
          description: true,
          coverStorageKey: true,
          mediaStorageKey: true,
          price: true,
          currency: true,
          durationSec: true,
          featured: true,
          published: true,
          spotifyUrl: true,
          appleBooksUrl: true,
          googlePlayUrl: true,
          audibleUrl: true,
          findawayUrl: true,
          createdAt: true,
        },
      });
    }

    return books.map((book) => this.mapBookForClient(book, includeStorageKeys));
  }

  async findOne(id: string, includeStorageKeys = false) {
    let book: any = null;
    try {
      book = await (this.prisma as any).book.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          author: true,
          description: true,
          coverStorageKey: true,
          mediaStorageKey: true,
          price: true,
          currency: true,
          durationSec: true,
          featured: true,
          published: true,
          spotifyUrl: true,
          appleBooksUrl: true,
          googlePlayUrl: true,
          audibleUrl: true,
          findawayUrl: true,
          createdAt: true,
          chapters: {
            select: { id: true, title: true, chapterOrder: true, durationSec: true, mediaStorageKey: true },
            orderBy: { chapterOrder: 'asc' },
          },
        },
      });
    } catch (error) {
      if (!this.isChapterSchemaError(error)) throw error;

      book = await (this.prisma as any).book.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          author: true,
          description: true,
          coverStorageKey: true,
          mediaStorageKey: true,
          price: true,
          currency: true,
          durationSec: true,
          featured: true,
          published: true,
          spotifyUrl: true,
          appleBooksUrl: true,
          googlePlayUrl: true,
          audibleUrl: true,
          findawayUrl: true,
          createdAt: true,
        },
      });
    }

    if (!book) throw new NotFoundException('Book not found');
    return this.mapBookForClient(book, includeStorageKeys);
  }

  async create(dto: CreateBookDto) {
    const chapters = this.normalizeChapters(dto.chapters);
    const isChaptered = Boolean(dto.isChaptered);
    const mediaStorageKey = dto.mediaStorageKey?.trim() || chapters[0]?.mediaStorageKey;

    if (isChaptered && chapters.length === 0) {
      throw new BadRequestException('Chapter mode requires at least one chapter');
    }

    if (!isChaptered && !dto.mediaStorageKey?.trim() && chapters.length === 0) {
      throw new BadRequestException('Single-file mode requires one media file');
    }

    if (!mediaStorageKey && chapters.length === 0) {
      throw new BadRequestException('Provide at least one audio file or chapter');
    }

    const chapterDuration = chapters.reduce((sum, chapter) => sum + chapter.durationSec, 0);
    const durationSec =
      dto.durationSec !== undefined ? Math.max(0, Math.floor(Number(dto.durationSec))) : chapterDuration;

    const created = await (this.prisma as any).book.create({
      data: {
        title: dto.title,
        author: dto.author,
        description: dto.description,
        coverStorageKey: dto.coverStorageKey,
        price: Number(dto.price),
        currency: dto.currency || 'NGN',
        durationSec,
        mediaStorageKey,
        published: Boolean(dto.published),
        featured: Boolean(dto.featured),
        chapters: chapters.length
          ? {
              create: chapters.map((chapter) => ({
                title: chapter.title,
                chapterOrder: chapter.chapterOrder,
                mediaStorageKey: chapter.mediaStorageKey,
                durationSec: chapter.durationSec,
              })),
            }
          : undefined,
      },
      include: {
        chapters: {
          select: { id: true, title: true, chapterOrder: true, durationSec: true, mediaStorageKey: true },
          orderBy: { chapterOrder: 'asc' },
        },
      },
    });

    return this.mapBookForClient(created, true);
  }

  async update(id: string, dto: Partial<CreateBookDto>) {
    const existing = await (this.prisma as any).book.findUnique({
      where: { id },
      include: { chapters: { orderBy: { chapterOrder: 'asc' } } },
    });
    if (!existing) throw new NotFoundException('Book not found');

    const chaptersProvided = Array.isArray(dto.chapters);
    const chapters = chaptersProvided ? this.normalizeChapters(dto.chapters) : undefined;
    const isChaptered = dto.isChaptered !== undefined ? Boolean(dto.isChaptered) : (existing.chapters?.length || 0) > 0;

    if (isChaptered && chaptersProvided && (chapters?.length || 0) === 0) {
      throw new BadRequestException('Chapter mode requires at least one valid chapter audio file');
    }

    if (!isChaptered && dto.mediaStorageKey !== undefined && !dto.mediaStorageKey?.trim()) {
      throw new BadRequestException('Single-file mode requires one media file');
    }

    if (chaptersProvided && (chapters?.length || 0) === 0 && !dto.mediaStorageKey && !existing.mediaStorageKey) {
      throw new BadRequestException('At least one valid chapter audio file is required');
    }

    const resolvedMediaStorageKey = dto.mediaStorageKey?.trim()
      || (chaptersProvided && chapters?.length ? chapters[0].mediaStorageKey : undefined)
      || existing.mediaStorageKey;

    if (!resolvedMediaStorageKey && !existing.chapters.length && !(chapters?.length || 0)) {
      throw new BadRequestException('Provide at least one audio file or chapter');
    }

    const chapterDuration = chaptersProvided
      ? (chapters || []).reduce((sum, chapter) => sum + chapter.durationSec, 0)
      : undefined;

    const updated = await (this.prisma as any).book.update({
      where: { id },
      data: {
        title: dto.title,
        author: dto.author,
        description: dto.description,
        coverStorageKey: dto.coverStorageKey,
        price: dto.price,
        currency: dto.currency,
        durationSec:
          dto.durationSec !== undefined
            ? Math.max(0, Math.floor(Number(dto.durationSec)))
            : chapterDuration,
        mediaStorageKey: resolvedMediaStorageKey,
        published: dto.published,
        featured: dto.featured,
        chapters: chaptersProvided
          ? {
              deleteMany: {},
              create: (chapters || []).map((chapter) => ({
                title: chapter.title,
                chapterOrder: chapter.chapterOrder,
                mediaStorageKey: chapter.mediaStorageKey,
                durationSec: chapter.durationSec,
              })),
            }
          : undefined,
      },
      include: {
        chapters: {
          select: { id: true, title: true, chapterOrder: true, durationSec: true, mediaStorageKey: true },
          orderBy: { chapterOrder: 'asc' },
        },
      },
    });

    return this.mapBookForClient(updated, true);
  }

  async unpublishAll() {
    const { count } = await (this.prisma as any).book.updateMany({
      where: { published: true },
      data: { published: false },
    });
    return { count };
  }

  async remove(id: string) {
    await this.findOne(id);

    const purchaseCount = await (this.prisma as any).purchase.count({
      where: { bookId: id },
    });
    if (purchaseCount > 0) {
      throw new BadRequestException(
        'This book has existing purchases and cannot be deleted. Unpublish it instead.',
      );
    }

    await (this.prisma as any).playbackSession.deleteMany({ where: { bookId: id } });
    return (this.prisma as any).book.delete({ where: { id } });
  }
}
