const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type UserMe = {
  id: string;
  username: string;
  profileKeywords: string[];
  createdAt: string;
  updatedAt: string;
};

export type Edital = {
  id: number;
  titulo: string;
  orgao: string;
  descricao: string;
  resumo_ia: string | null;
  tags_ia: string[] | null;
  url: string;
  data_inicio: string | null;
  data_fim: string | null;
  notificado_novo: boolean;
  notificado_prazo: boolean;
  criado_em: string;
  relevance_score?: number | null;
};

export type ListEditaisResponse = {
  items: Edital[];
  total: number;
  limit: number;
  offset: number;
};

export type CollectionStatus = {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'failed';
  inserted_count: number;
  notified_new_count: number;
  notified_deadline_count: number;
  error_message: string | null;
};

export type UserProfileResponse = {
  profileKeywords: string[];
};

export type OpsHealthResponse = {
  status: 'ok' | 'degraded';
  timestamp: string;
  backend: { status: 'ok' };
  scraper: {
    status: 'up' | 'down';
    latencyMs?: number;
    httpStatus?: number;
    error?: string;
  };
  latestCollection: CollectionStatus | null;
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

export async function getUserProfile(): Promise<UserProfileResponse> {
  const res = await fetchWithAuth(`${API_BASE}/user/profile`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Falha ao buscar perfil');
  }
  return res.json();
}

export async function updateUserProfile(profileKeywords: string[]): Promise<UserProfileResponse> {
  const res = await fetchWithAuth(`${API_BASE}/user/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileKeywords }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Falha ao atualizar perfil');
  }
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

export async function getEditais(params?: {
  orgao?: string;
  q?: string;
  status?: 'abertos' | 'encerrados';
  limit?: number;
  offset?: number;
}): Promise<ListEditaisResponse> {
  const query = new URLSearchParams();
  if (params?.orgao) query.set('orgao', params.orgao);
  if (params?.q) query.set('q', params.q);
  if (params?.status) query.set('status', params.status);
  if (typeof params?.limit === 'number') query.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') query.set('offset', String(params.offset));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const res = await fetchWithAuth(`${API_BASE}/editais${suffix}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Falha ao buscar editais');
  }
  return res.json();
}

export async function triggerCollection(): Promise<CollectionStatus> {
  const res = await fetchWithAuth(`${API_BASE}/editais/coleta`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Falha ao disparar coleta');
  }
  return res.json();
}

export async function getLatestCollectionStatus(): Promise<CollectionStatus | null> {
  const res = await fetchWithAuth(`${API_BASE}/editais/coleta/status`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Falha ao buscar status da coleta');
  }
  return res.json();
}

export async function getOpsHealth(): Promise<OpsHealthResponse> {
  const res = await fetchWithAuth(`${API_BASE}/ops/health`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Falha ao buscar health operacional');
  }
  return res.json();
}
