import { IsIn } from 'class-validator';
import {
  APPLICATION_STATUSES,
  ApplicationStatus,
} from '../../user/entities/user-application.entity';

export class SetStatusDto {
  @IsIn(APPLICATION_STATUSES as unknown as string[])
  status: ApplicationStatus;
}
