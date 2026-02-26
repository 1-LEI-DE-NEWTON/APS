import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

export function ApiLogin() {
  return applyDecorators(
    ApiOperation({ summary: 'Login com usuário e senha' }),
    ApiResponse({ status: 200, description: 'Retorna accessToken e refreshToken' }),
    ApiResponse({ status: 401, description: 'Credenciais inválidas' }),
  );
}

export function ApiRefresh() {
  return applyDecorators(
    ApiOperation({ summary: 'Renova o access token usando refresh token' }),
    ApiResponse({ status: 200, description: 'Novo par de tokens' }),
    ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado' }),
  );
}

export function ApiLogout() {
  return applyDecorators(
    ApiOperation({ summary: 'Logout - invalida o refresh token enviado' }),
    ApiResponse({ status: 200, description: 'Logout realizado' }),
  );
}

export function ApiLogoutAll() {
  return applyDecorators(
    ApiOperation({ summary: 'Logout em todos os dispositivos do usuário' }),
    ApiBearerAuth(),
    ApiResponse({ status: 200, description: 'Todos os refresh tokens do usuário foram invalidados' }),
    ApiResponse({ status: 401, description: 'Não autorizado' }),
  );
}
