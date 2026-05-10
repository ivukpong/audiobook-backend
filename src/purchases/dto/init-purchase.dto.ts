import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class InitPurchaseDto {
  @ApiProperty() @IsString() bookId: string;
  @ApiProperty()
  @IsUrl(
    { require_protocol: true },
    { message: 'callbackUrl must be a valid HTTP/HTTPS URL' }
  )
  callbackUrl: string;
}
