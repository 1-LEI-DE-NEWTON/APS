const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type UserMe = {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
};

async function getStoredTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const access = localStorage.getItem('accessToken');
  const refresh = localStorage.getItem('refreshToken');
  if (access && refresh) return { accessToken: access, refreshToken: refresh };
  return null;
}

async function setStoredTokens(tokens: TokenResponse): Promise<void> {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
}

export function clearStoredTokens(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Falha no login');
  }
  return res.json();
}

export async function refreshTokens(): Promise<TokenResponse> {
  const stored = await getStoredTokens();
  if (!stored) throw new Error('Sem refresh token');
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: stored.refreshToken }),
  });
  if (!res.ok) {
    clearStoredTokens();
    throw new Error('Sessão expirada');
  }
  const data: TokenResponse = await res.json();
  await setStoredTokens(data);
  return data;
}

export async function logout(): Promise<void> {
  const stored = await getStoredTokens();
  if (stored?.refreshToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      });
    } catch {
      // ignore
    }
  }
  clearStoredTokens();
}

export async function fetchWithAuth(
  input: string,
  init?: RequestInit
): Promise<Response> {
  let tokens = await getStoredTokens();
  if (!tokens) {
    return new Response(JSON.stringify({ message: 'Não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const doRequest = (access: string) =>
    fetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${access}`,
      },
    });
  let res = await doRequest(tokens.accessToken);
  if (res.status === 401) {
    try {
      const newTokens = await refreshTokens();
      res = await doRequest(newTokens.accessToken);
    } catch {
      return res;
    }
  }
  return res;
}

export async function getMe(): Promise<UserMe> {
  const res = await fetchWithAuth(`${API_BASE}/user/me`);
  if (!res.ok) throw new Error('Não autenticado');
  return res.json();
}

export async function createUser(username: string, password: string): Promise<UserMe> {
  const res = await fetch(`${API_BASE}/user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Falha ao criar usuário');
  }
  return res.json();
}
