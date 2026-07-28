import { Type } from 'class-transformer';
import { IsString, IsNumber, IsBoolean, IsOptional, Min, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookChapterDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  mediaStorageKey: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSec?: number;
}

export class CreateBookDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() author: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsString() coverStorageKey: string;
  @ApiProperty() @IsNumber() @Min(0) price: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) durationSec?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() mediaStorageKey?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isChaptered?: boolean;
  @ApiPropertyOptional({ type: [CreateBookChapterDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBookChapterDto)
  chapters?: CreateBookChapterDto[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() published?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featured?: boolean;
}
