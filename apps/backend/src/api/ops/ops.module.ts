import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller';
import { OpsMetricsService } from './services/ops-metrics.service';
import { OpsService } from './services/ops.service';

@Module({
  controllers: [OpsController],
  providers: [OpsMetricsService, OpsService],
  exports: [OpsMetricsService],
})
export class OpsModule {}
