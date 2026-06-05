const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { message?: string; error?: string },
  ) {
    super(body.message ?? body.error ?? `HTTP ${status}`);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, token, signal } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errorBody);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ userId: string; message: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  verifyOtp: (userId: string, otp: string) =>
    apiRequest<{
      accessToken: string;
      user: { id: string; name: string; email: string; role: string };
    }>('/auth/verify-otp', {
      method: 'POST',
      body: { userId, otp },
    }),

  refresh: () =>
    apiRequest<{ accessToken: string }>('/auth/refresh', { method: 'POST' }),

  logout: (token: string) =>
    apiRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
      token,
    }),
};
