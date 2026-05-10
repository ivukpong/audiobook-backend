import { Controller, Get, Post, Param, Body, UseGuards, Headers } from '@nestjs/common';
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
}
