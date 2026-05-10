import { Controller, Post, Body, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Post('refresh') refresh(@Body('refreshToken') token: string) { return this.auth.refresh(token); }
  @Delete('logout') logout(@Body('refreshToken') token: string) { return this.auth.logout(token); }
}
