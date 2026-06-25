import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class SetReminderDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(90)
  daysBefore: number;
}
