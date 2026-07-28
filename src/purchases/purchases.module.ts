import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { PrismaService } from '../common/prisma.service';
import { PaystackModule } from '../paystack/paystack.module';
import { BooksModule } from '../books/books.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PaystackModule, BooksModule, StorageModule],
  controllers: [PurchasesController],
  providers: [PurchasesService, PrismaService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
