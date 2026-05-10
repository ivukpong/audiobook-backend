import { Controller, Get, Post, Param, Body, UseGuards, Headers, Res, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PlaybackService } from './playback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Playback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('playback')
export class PlaybackController {
  constructor(private playback: PlaybackService) {}

  @Get('stream/:bookId')
  getStream(
    @CurrentUser() user: any,
    @Param('bookId') bookId: string,
    @Headers('x-device-id') deviceId: string,
  ) {
    return this.playback.getStreamUrl(user.id, bookId, deviceId || 'default');
  }

  @Post('progress/:bookId')
  saveProgress(
    @CurrentUser() user: any,
    @Param('bookId') bookId: string,
    @Headers('x-device-id') deviceId: string,
    @Body('progressSec') progressSec: number,
  ) {
    return this.playback.saveProgress(user.id, bookId, deviceId || 'default', progressSec);
  }

  @Get('progress/:bookId')
  getProgress(
    @CurrentUser() user: any,
    @Param('bookId') bookId: string,
    @Headers('x-device-id') deviceId: string,
  ) {
    return this.playback.getProgress(user.id, bookId, deviceId || 'default');
  }

  @Get('download/:bookId')
  async downloadBook(
    @CurrentUser() user: any,
    @Param('bookId') bookId: string,
    @Headers('x-device-id') deviceId: string,
    @Res({ passthrough: true }) res: any,
  ) {
    const { stream, filename, mimeType } = await this.playback.getDownloadStream(
      user.id,
      bookId,
      deviceId || 'default',
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');

    return new StreamableFile(stream);
  }
}
