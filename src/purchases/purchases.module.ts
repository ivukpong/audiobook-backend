import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { PrismaService } from '../common/prisma.service';
import { PaystackModule } from '../paystack/paystack.module';
import { BooksModule } from '../books/books.module';

@Module({
  imports: [PaystackModule, BooksModule],
  controllers: [PurchasesController],
  providers: [PurchasesService, PrismaService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
