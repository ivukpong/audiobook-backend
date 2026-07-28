import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BooksService } from './books.service';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private books: BooksService) {}

  @Get()
  findAll() { return this.books.findAll(true); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.books.findOne(id); }
}
