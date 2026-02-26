import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UserService } from '../../user/services/user.service';
import { RefreshTokenRepository } from '../repository/refresh-token.repository';
import { RefreshToken } from '../entities/refresh-token.entity';
import { LoginDto } from '../dtos';
import { TokenResponseDto } from '../dtos/token-response.dto';
import { User } from '../../user/entities/user.entity';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class AuthService {
  private readonly accessExpiresInSec: number;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {
    this.accessExpiresInSec = 15 * 60; // 15 min
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.userService.findByUsername(dto.username);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const valid = await this.userService.validatePassword(user, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshTokenValue: string): Promise<TokenResponseDto> {
    const tokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.refreshTokenRepository.deleteById(stored.id);
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
    await this.refreshTokenRepository.deleteById(stored.id);
    return this.issueTokens(stored.user);
  }

  async logout(refreshTokenValue: string | undefined): Promise<void> {
    if (!refreshTokenValue) return;
    const tokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (stored) {
      await this.refreshTokenRepository.deleteById(stored.id);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.deleteByUserId(userId);
  }

  private async issueTokens(user: User): Promise<TokenResponseDto> {
    const payload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'access-secret-change-me',
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    const refreshTokenEntity = new RefreshToken();
    refreshTokenEntity.userId = user.id;
    refreshTokenEntity.tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    refreshTokenEntity.expiresAt = expiresAt;
    await this.refreshTokenRepository.save(refreshTokenEntity);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessExpiresInSec,
    };
  }
}
