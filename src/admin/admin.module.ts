import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { BooksModule } from '../books/books.module';
import { StorageModule } from '../storage/storage.module';
import { PrismaService } from '../common/prisma.service';

@Module({
  imports: [BooksModule, StorageModule],
  controllers: [AdminController],
  providers: [PrismaService],
})
export class AdminModule {}
