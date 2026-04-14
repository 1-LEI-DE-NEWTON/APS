import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateUserAccountDto {
  @ApiPropertyOptional({ example: 'usuario_novo' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'username deve ter no mínimo 3 caracteres' })
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username deve conter apenas letras, números e underscore',
  })
  username?: string;

  @ApiPropertyOptional({ example: 'NovaSenhaSegura123!' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'senha deve ter no mínimo 8 caracteres' })
  @MaxLength(128)
  password?: string;
}
