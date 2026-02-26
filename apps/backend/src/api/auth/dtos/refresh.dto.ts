import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token para obter novo access token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
