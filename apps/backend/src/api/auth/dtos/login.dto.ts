import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'usuario' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'SenhaSegura123!' })
  @IsString()
  @MinLength(1, { message: 'senha é obrigatória' })
  password: string;
}
