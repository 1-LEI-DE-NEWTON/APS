import { Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { QueryEditaisDto } from './dtos/query-editais.dto';
import { EditaisService } from './services/editais.service';

@ApiTags('editais')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('editais')
export class EditaisController {
  constructor(private readonly editaisService: EditaisService) {}

  @Get()
  @ApiOperation({ summary: 'Lista editais com filtros opcionais' })
  async list(@CurrentUser() user: User, @Query() query: QueryEditaisDto) {
    return this.editaisService.list(user, query);
  }

  @Post('coleta')
  @ApiOperation({ summary: 'Dispara uma coleta imediata no serviço Python' })
  async triggerCollection() {
    return this.editaisService.triggerCollection();
  }

  @Get('coleta/status')
  @ApiOperation({ summary: 'Retorna status da última coleta executada' })
  async getLatestCollectionStatus() {
    return this.editaisService.getLatestCollectionStatus();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retorna um edital por id' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.editaisService.getById(id);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: 'Alterna status de favorito de um edital' })
  async toggleFavorite(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.editaisService.toggleFavorite(user, id);
  }
}
