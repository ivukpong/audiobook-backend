import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateBookChapterDto, CreateBookDto } from './dto/create-book.dto';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

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
    const books = await (this.prisma as any).book.findMany({
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
    return books.map((book) => this.mapBookForClient(book, includeStorageKeys));
  }

  async findOne(id: string, includeStorageKeys = false) {
    const book = await (this.prisma as any).book.findUnique({
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
    if (!book) throw new NotFoundException('Book not found');
    return this.mapBookForClient(book, includeStorageKeys);
  }

  async create(dto: CreateBookDto) {
    const chapters = this.normalizeChapters(dto.chapters);
    const mediaStorageKey = dto.mediaStorageKey?.trim() || chapters[0]?.mediaStorageKey;

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

  async remove(id: string) {
    await this.findOne(id);
    return (this.prisma as any).book.delete({ where: { id } });
  }
}
