import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { SetStatusDto } from './dtos/set-status.dto';
import { SetReminderDto } from './dtos/set-reminder.dto';
import { TrackingService } from './services/tracking.service';

@ApiTags('tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('candidaturas')
  @ApiOperation({ summary: 'Lista os editais que o usuário está acompanhando (candidaturas)' })
  async listCandidaturas(@CurrentUser() user: User) {
    return this.trackingService.listCandidaturas(user.id);
  }

  @Put('editais/:id/status')
  @ApiOperation({ summary: 'Define/atualiza o status de candidatura de um edital' })
  async setStatus(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetStatusDto,
  ) {
    return this.trackingService.setStatus(user.id, id, dto.status);
  }

  @Delete('editais/:id/status')
  @ApiOperation({ summary: 'Remove o acompanhamento de candidatura de um edital' })
  async removeStatus(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.trackingService.removeStatus(user.id, id);
  }

  @Put('editais/:id/reminder')
  @ApiOperation({ summary: 'Define/atualiza um lembrete de prazo (dias antes do fim)' })
  async setReminder(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetReminderDto,
  ) {
    return this.trackingService.setReminder(user.id, id, dto.daysBefore);
  }

  @Delete('editais/:id/reminder')
  @ApiOperation({ summary: 'Remove o lembrete de prazo de um edital' })
  async removeReminder(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.trackingService.removeReminder(user.id, id);
  }
}
