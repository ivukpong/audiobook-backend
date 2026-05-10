import { Controller, Post, Get, Body, Param, UseGuards, Req, RawBodyRequest, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InitPurchaseDto } from './dto/init-purchase.dto';

@ApiTags('Purchases')
@Controller('purchases')
export class PurchasesController {
  constructor(private purchases: PurchasesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('initiate')
  initiate(@CurrentUser() user: any, @Body() dto: InitPurchaseDto) {
    return this.purchases.initiate(user.id, user.email, dto);
  }

  @Post('webhook')
  webhook(@Req() req: RawBodyRequest<Request>, @Headers('x-paystack-signature') sig: string) {
    return this.purchases.handleWebhook(req.rawBody?.toString() || '', sig);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('verify/:reference')
  verify(@Param('reference') reference: string) {
    return this.purchases.verifyAndComplete(reference);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('library')
  library(@CurrentUser() user: any) {
    return this.purchases.getUserLibrary(user.id);
  }
}
