import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Edital } from '../editais/entities/edital.entity';
import { UserApplication } from '../user/entities/user-application.entity';
import { UserReminder } from '../user/entities/user-reminder.entity';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './services/tracking.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserApplication, UserReminder, Edital])],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
