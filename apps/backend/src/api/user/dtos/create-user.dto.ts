import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario' })
  @IsString()
  @MinLength(3, { message: 'username deve ter no mínimo 3 caracteres' })
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username deve conter apenas letras, números e underscore',
  })
  username: string;

  @ApiProperty({ example: 'SenhaSegura123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'senha deve ter no mínimo 8 caracteres' })
  @MaxLength(128)
  password: string;
}
