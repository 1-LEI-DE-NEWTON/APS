import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './services/user.service';
import { CreateUserDto } from './dtos';
import { ApiCreateUser, ApiGetMe } from './docs/user.swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiCreateUser()
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiGetMe()
  async me(@CurrentUser() user: User) {
    const { passwordHash, passwordSalt, ...result } = user;
    return result;
  }
}
