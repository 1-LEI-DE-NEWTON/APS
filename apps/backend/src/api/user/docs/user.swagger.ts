import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

export function ApiCreateUser() {
  return applyDecorators(
    ApiOperation({ summary: 'Cria um novo usuário' }),
    ApiResponse({ status: 201, description: 'Usuário criado com sucesso' }),
    ApiResponse({ status: 400, description: 'Dados inválidos' }),
    ApiResponse({ status: 409, description: 'Username já em uso' }),
  );
}

export function ApiGetMe() {
  return applyDecorators(
    ApiOperation({ summary: 'Retorna o usuário autenticado' }),
    ApiBearerAuth(),
    ApiResponse({ status: 200, description: 'Dados do usuário' }),
    ApiResponse({ status: 401, description: 'Não autorizado' }),
  );
}

export function ApiGetProfile() {
  return applyDecorators(
    ApiOperation({ summary: 'Retorna o perfil de relevância do usuário' }),
    ApiBearerAuth(),
    ApiResponse({ status: 200, description: 'Perfil retornado com sucesso' }),
    ApiResponse({ status: 401, description: 'Não autorizado' }),
  );
}

export function ApiUpdateProfile() {
  return applyDecorators(
    ApiOperation({ summary: 'Atualiza o perfil de relevância do usuário' }),
    ApiBearerAuth(),
    ApiResponse({ status: 200, description: 'Perfil atualizado com sucesso' }),
    ApiResponse({ status: 400, description: 'Dados inválidos' }),
    ApiResponse({ status: 401, description: 'Não autorizado' }),
  );
}
