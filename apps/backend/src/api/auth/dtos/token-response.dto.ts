import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({ description: 'Token de acesso JWT' })
  accessToken: string;

  @ApiProperty({ description: 'Token de renovação' })
  refreshToken: string;

  @ApiProperty({ description: 'Tempo de expiração do access token em segundos' })
  expiresIn: number;
}
