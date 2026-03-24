import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

export class UpdateUserProfileDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter((entry) => entry.length > 0)
      : []
  )
  profileKeywords: string[];
}
