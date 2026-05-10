import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private books: BooksService) {}

  @Get()
  findAll() { return this.books.findAll(true); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.books.findOne(id); }
}
