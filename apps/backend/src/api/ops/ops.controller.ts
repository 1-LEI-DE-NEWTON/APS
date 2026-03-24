import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OpsService } from './services/ops.service';

@ApiTags('ops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ops')
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Retorna health agregado de backend e scraper' })
  async getHealth() {
    return this.opsService.getHealth();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Retorna métricas de integração com scraper' })
  getMetrics() {
    return this.opsService.getMetrics();
  }
}
