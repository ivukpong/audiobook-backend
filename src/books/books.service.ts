import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateBookDto } from './dto/create-book.dto';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  async findAll(publishedOnly = true) {
    const books = await this.prisma.book.findMany({
      where: publishedOnly ? { published: true } : {},
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, author: true, description: true, coverStorageKey: true,
        price: true, currency: true, durationSec: true, featured: true, published: true,
        spotifyUrl: true, appleBooksUrl: true, googlePlayUrl: true, audibleUrl: true, findawayUrl: true,
        createdAt: true },
    });
    return books.map(book => ({
      ...book,
      coverUrl: book.coverStorageKey ? this.storage.getPublicUrl(book.coverStorageKey) : null,
      coverStorageKey: undefined,
    }));
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: { id: true, title: true, author: true, description: true, coverStorageKey: true,
        price: true, currency: true, durationSec: true, featured: true, published: true,
        spotifyUrl: true, appleBooksUrl: true, googlePlayUrl: true, audibleUrl: true, findawayUrl: true,
        createdAt: true },
    });
    if (!book) throw new NotFoundException('Book not found');
    return {
      ...book,
      coverUrl: book.coverStorageKey ? this.storage.getPublicUrl(book.coverStorageKey) : null,
      coverStorageKey: undefined,
    };
  }

  create(dto: CreateBookDto) {
    return this.prisma.book.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateBookDto>) {
    await this.findOne(id);
    return this.prisma.book.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.book.delete({ where: { id } });
  }
}
