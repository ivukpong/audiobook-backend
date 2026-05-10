import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PlaybackModule } from './playback/playback.module';
import { StorageModule } from './storage/storage.module';
import { PaystackModule } from './paystack/paystack.module';
import { AdminModule } from './admin/admin.module';
import { PrismaService } from './common/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MulterModule.register({ limits: { fileSize: 500 * 1024 * 1024 } }), // 500MB max file size
    AuthModule,
    UsersModule,
    BooksModule,
    PurchasesModule,
    PlaybackModule,
    StorageModule,
    PaystackModule,
    AdminModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
