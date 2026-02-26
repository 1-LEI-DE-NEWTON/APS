import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './services/auth.service';
import { LoginDto, RefreshTokenDto } from './dtos';
import { ApiLogin, ApiRefresh, ApiLogout, ApiLogoutAll } from './docs/auth.swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiLogin()
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiRefresh()
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiLogout()
  async logout(
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
  ) {
    const token =
      body?.refreshToken ?? (req.body as { refreshToken?: string })?.refreshToken;
    await this.authService.logout(token);
    return { message: 'Logout realizado' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiLogoutAll()
  async logoutAll(@CurrentUser() user: User) {
    await this.authService.logoutAll(user.id);
    return { message: 'Logout em todos os dispositivos realizado' };
  }
}
