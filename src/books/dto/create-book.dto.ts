import { IsString, IsNumber, IsBoolean, IsOptional, IsUrl, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateBookDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() author: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsString() coverStorageKey: string;
  @ApiProperty() @IsNumber() @Min(0) price: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiProperty() @IsNumber() durationSec: number;
  @ApiProperty() @IsString() mediaStorageKey: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() published?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUrl() spotifyUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() appleBooksUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() googlePlayUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() audibleUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() findawayUrl?: string;
}
