import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../common/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');
    const hash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash: hash },
    });
    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user.id, user.email);
  }

  async refresh(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) throw new UnauthorizedException('Session expired');
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    await this.prisma.refreshToken.delete({ where: { token } });
    return this.issueTokens(user.id, user.email);
  }

  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
    return { message: 'Logged out' };
  }

  private async issueTokens(userId: string, email: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, email },
      { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m' },
    );
    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt } });
    return { accessToken, refreshToken };
  }
}
