import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BooksService } from '../books/books.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../common/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateBookDto } from '../books/dto/create-book.dto';
import { Role } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private books: BooksService,
    private storage: StorageService,
    private prisma: PrismaService,
  ) {}

  @Get('books')
  allBooks() { return this.books.findAll(false); }

  @Post('books')
  createBook(@Body() dto: CreateBookDto) { return this.books.create(dto); }

  @Patch('books/:id')
  updateBook(@Param('id') id: string, @Body() dto: Partial<CreateBookDto>) { return this.books.update(id, dto); }

  @Delete('books/:id')
  deleteBook(@Param('id') id: string) { return this.books.remove(id); }

  @Get('books/:id/findaway-readiness')
  async getFindawayReadiness(@Param('id') id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        coverStorageKey: true,
        mediaStorageKey: true,
        durationSec: true,
        price: true,
        currency: true,
        published: true,
        findawayUrl: true,
      },
    });

    if (!book) throw new BadRequestException('Book not found');

    const checks = {
      title: Boolean(book.title?.trim()),
      author: Boolean(book.author?.trim()),
      description: Boolean(book.description?.trim()) && book.description.trim().length >= 50,
      coverAsset: Boolean(book.coverStorageKey?.trim()),
      audioAsset: Boolean(book.mediaStorageKey?.trim()),
      duration: book.durationSec > 0,
      pricing: book.price > 0,
      currency: Boolean(book.currency?.trim()),
      published: book.published,
    };

    const missing: string[] = [];
    if (!checks.title) missing.push('Book title is required.');
    if (!checks.author) missing.push('Author name is required.');
    if (!checks.description) missing.push('Description is required and should be at least 50 characters.');
    if (!checks.coverAsset) missing.push('Cover file is required.');
    if (!checks.audioAsset) missing.push('Audio media file is required.');
    if (!checks.duration) missing.push('Duration must be greater than 0.');
    if (!checks.pricing) missing.push('Price must be greater than 0.');
    if (!checks.currency) missing.push('Currency is required.');
    if (!checks.published) missing.push('Book must be published before external distribution.');

    return {
      ready: missing.length === 0,
      book,
      checks,
      missing,
      nextSteps: [
        'Confirm rights/territories in your legal workflow.',
        'Confirm narrator and contributor metadata.',
        'Submit title package in Findaway partner portal.',
      ],
      submitted: Boolean(book.findawayUrl),
    };
  }

  @Post('upload/cover')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('File must be an image');
    const key = `covers/${Date.now()}-${this.sanitizeFileName(file.originalname)}`;
    const storageKey = await this.storage.uploadFile(key, file.buffer, file.mimetype);
    return { storageKey };
  }

  @Post('upload/media')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (!file.mimetype.startsWith('audio/')) throw new BadRequestException('File must be an audio file');
    const key = `media/${Date.now()}-${this.sanitizeFileName(file.originalname)}`;
    const storageKey = await this.storage.uploadFile(key, file.buffer, file.mimetype);
    return { storageKey };
  }

  private sanitizeFileName(fileName: string) {
    return fileName
      .toLowerCase()
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  @Get('stats')
  async stats() {
    const [users, books, purchases, revenue] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.book.count({ where: { published: true } }),
      this.prisma.purchase.count({ where: { status: 'COMPLETED' } }),
      this.prisma.purchase.aggregate({ where: { status: 'COMPLETED' }, _sum: { amountPaid: true } }),
    ]);
    return { users, books, purchases, totalRevenue: revenue._sum.amountPaid ?? 0 };
  }
}
