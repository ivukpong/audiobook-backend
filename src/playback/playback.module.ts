import { Module } from '@nestjs/common';
import { PlaybackService } from './playback.service';
import { PlaybackController } from './playback.controller';
import { PrismaService } from '../common/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { BooksModule } from '../books/books.module';

@Module({
  imports: [StorageModule, PurchasesModule, BooksModule],
  controllers: [PlaybackController],
  providers: [PlaybackService, PrismaService],
})
export class PlaybackModule {}
