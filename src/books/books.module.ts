import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [BooksController],
  providers: [BooksService, PrismaService],
  exports: [BooksService],
})
export class BooksModule {}
