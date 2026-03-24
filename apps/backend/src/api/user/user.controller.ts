import { Controller, Post, Get, Body, UseGuards, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './services/user.service';
import { CreateUserDto, UpdateUserProfileDto } from './dtos';
import { ApiCreateUser, ApiGetMe, ApiGetProfile, ApiUpdateProfile } from './docs/user.swagger';
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

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiGetProfile()
  async getProfile(@CurrentUser() user: User) {
    return {
      profileKeywords: await this.userService.getProfileKeywords(user.id),
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiUpdateProfile()
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserProfileDto
  ) {
    return {
      profileKeywords: await this.userService.updateProfileKeywords(user.id, dto.profileKeywords),
    };
  }
}
