import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateBookDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() author: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsString() coverStorageKey: string;
  @ApiProperty() @IsNumber() @Min(0) price: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) durationSec?: number;
  @ApiProperty() @IsString() mediaStorageKey: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() published?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featured?: boolean;
}
