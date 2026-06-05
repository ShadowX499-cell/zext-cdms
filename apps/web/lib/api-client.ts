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

// ── Shared types ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Vehicle {
  id: string;
  name: string;
  category: string;
  chassisNumber: string;
  engineNumber: string;
  plateNumber: string | null;
  colour: string;
  ownerName: string;
  modeOfPurchase: string;
  purchasePrice?: string | null;
  status: string;
  dateBought: string;
  notes: string | null;
  registeredById: string;
  createdAt: string;
  updatedAt: string;
  photos?: { id: string; url: string; isCover: boolean }[];
  registeredBy?: { name: string };
  history?: VehicleHistoryEntry[];
  sale?: { id: string; dateSold: string; buyerName: string; sellingPrice: string; modeOfSale: string; isReversed: boolean } | null;
}

export interface VehicleHistoryEntry {
  id: string;
  event: string;
  description: string;
  createdAt: string;
  performedBy: { name: string };
}

export interface Sale {
  id: string;
  dateSold: string;
  vehicleId: string;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  witnessName: string;
  sellingPrice: string;
  modeOfSale: string;
  isReversed: boolean;
  reversalReason?: string | null;
  notes?: string | null;
  createdAt: string;
  vehicle?: { name: string; chassisNumber: string; category: string };
  registeredBy?: { name: string };
  receipt?: { id: string; receiptNumber: string; type: string; isVoided: boolean } | null;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  receiptYear: number;
  receiptSequence: number;
  receiptDate: string;
  type: string;
  isVoided: boolean;
  voidReason?: string | null;
  voidedAt?: string | null;
  saleId?: string | null;
  createdAt: string;
  issuedBy?: { name: string };
  sale?: {
    buyerName: string;
    sellingPrice: string;
    vehicle?: { name: string; chassisNumber: string } | null;
  } | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface DashboardMetrics {
  inventoryAvailable: number;
  inventoryTotal: number;
  soldThisMonth: number;
  registeredThisMonth: number;
  revenueThisMonth: string | null;
  revenueThisYear: string | null;
  totalRevenue: string | null;
  recentVehicles: Array<{ id: string; name: string; category: string; status: string; colour: string; createdAt: string; photos: Array<{ url: string }> }>;
  recentSales: Array<{ id: string; dateSold: string; buyerName: string; sellingPrice: string; modeOfSale: string; vehicle: { name: string; category: string }; receipt: { receiptNumber: string } | null }>;
}

// ── Vehicles API ──────────────────────────────────────────────────────────────

export const vehiclesApi = {
  list: (token: string, params?: { status?: string; category?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiRequest<PaginatedResponse<Vehicle>>(`/vehicles?${q}`, { token });
  },

  get: (token: string, id: string) =>
    apiRequest<Vehicle>(`/vehicles/${id}`, { token }),

  create: (token: string, data: Record<string, unknown>) =>
    apiRequest<Vehicle>('/vehicles', { method: 'POST', body: data, token }),

  update: (token: string, id: string, data: Record<string, unknown>) =>
    apiRequest<Vehicle>(`/vehicles/${id}`, { method: 'PATCH', body: data, token }),
};

// ── Sales API ─────────────────────────────────────────────────────────────────

export const salesApi = {
  list: (token: string, params?: { reversed?: boolean; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.reversed !== undefined) q.set('reversed', String(params.reversed));
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiRequest<PaginatedResponse<Sale>>(`/sales?${q}`, { token });
  },

  get: (token: string, id: string) =>
    apiRequest<Sale>(`/sales/${id}`, { token }),

  create: (token: string, data: Record<string, unknown>) =>
    apiRequest<{ sale: Sale; receipt: Receipt }>('/sales', { method: 'POST', body: data, token }),

  reverse: (token: string, id: string, reversalReason: string) =>
    apiRequest<{ message: string }>(`/sales/${id}/reverse`, { method: 'PATCH', body: { reversalReason }, token }),
};

// ── Receipts API ──────────────────────────────────────────────────────────────

export const receiptsApi = {
  list: (token: string, params?: { type?: string; voided?: boolean; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.voided !== undefined) q.set('voided', String(params.voided));
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiRequest<PaginatedResponse<Receipt>>(`/receipts?${q}`, { token });
  },

  get: (token: string, id: string) =>
    apiRequest<Receipt>(`/receipts/${id}`, { token }),

  void: (token: string, id: string, reason: string) =>
    apiRequest<Receipt>(`/receipts/${id}/void`, { method: 'PATCH', body: { reason }, token }),

  downloadPdf: async (token: string, id: string, receiptNumber: string) => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
    const res = await fetch(`${BASE_URL}/receipts/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to download PDF');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receiptNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ── Customers API ─────────────────────────────────────────────────────────────

export const customersApi = {
  list: (token: string, search?: string, page = 1) => {
    const q = new URLSearchParams({ page: String(page) });
    if (search) q.set('search', search);
    return apiRequest<PaginatedResponse<Customer>>(`/customers?${q}`, { token });
  },

  create: (token: string, data: { name: string; phone: string; address?: string }) =>
    apiRequest<Customer>('/customers', { method: 'POST', body: data, token }),
};

// ── Dashboard API ─────────────────────────────────────────────────────────────

export const dashboardApi = {
  metrics: (token: string) =>
    apiRequest<DashboardMetrics>('/dashboard/metrics', { token }),
};

// ── Swaps API ─────────────────────────────────────────────────────────────────

export interface Swap {
  id: string;
  dateOfSwap: string;
  outgoingVehicleId: string;
  incomingVehicleId: string;
  modeOfSwap: string;
  cashDifference?: string | null;
  cashDirection?: string | null;
  witnessName: string;
  notes?: string | null;
  createdAt: string;
  outgoingVehicle?: { name: string; chassisNumber: string };
  incomingVehicle?: { name: string; chassisNumber: string };
  registeredBy?: { name: string };
  receipt?: { receiptNumber: string } | null;
}

export const swapsApi = {
  list: (token: string, page = 1, limit = 20) =>
    apiRequest<PaginatedResponse<Swap>>(`/swaps?page=${page}&limit=${limit}`, { token }),

  get: (token: string, id: string) =>
    apiRequest<Swap>(`/swaps/${id}`, { token }),

  create: (token: string, data: Record<string, unknown>) =>
    apiRequest<{ swap: Swap; receipt: Receipt }>('/swaps', { method: 'POST', body: data, token }),
};

// ── Accessories API ───────────────────────────────────────────────────────────

export interface AccessoryItem {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  quantityInStock: number;
  sellingPrice: string;
  costPrice?: string | null;
  lowStockThreshold: number;
  chassisNumber?: string | null;
  engineNumber?: string | null;
  createdAt: string;
}

export interface AccessorySale {
  id: string;
  dateSold: string;
  buyerName: string;
  buyerPhone?: string | null;
  paymentMode: string;
  totalAmount: string;
  createdAt: string;
  registeredBy?: { name: string };
  receipt?: { receiptNumber: string } | null;
  items?: Array<{ quantity: number; unitPrice: string; subtotal: string; accessoryItem: { name: string } }>;
}

export const accessoriesApi = {
  listItems: (token: string, search?: string, page = 1) => {
    const q = new URLSearchParams({ page: String(page) });
    if (search) q.set('search', search);
    return apiRequest<PaginatedResponse<AccessoryItem>>(`/accessories/items?${q}`, { token });
  },

  createItem: (token: string, data: Record<string, unknown>) =>
    apiRequest<AccessoryItem>('/accessories/items', { method: 'POST', body: data, token }),

  updateItem: (token: string, id: string, data: Record<string, unknown>) =>
    apiRequest<AccessoryItem>(`/accessories/items/${id}`, { method: 'PATCH', body: data, token }),

  listSales: (token: string, page = 1) =>
    apiRequest<PaginatedResponse<AccessorySale>>(`/accessories/sales?page=${page}`, { token }),

  createSale: (token: string, data: Record<string, unknown>) =>
    apiRequest<{ accessorySale: AccessorySale; receipt: Receipt }>('/accessories/sales', { method: 'POST', body: data, token }),
};

// ── Revenue API ───────────────────────────────────────────────────────────────

export interface RevenueSummary {
  totalRevenue: string;
  totalSalesCount: number;
  revenueThisMonth: string;
  salesCountThisMonth: number;
  revenueThisYear: string;
  salesCountThisYear: number;
  byCategory: Record<string, number>;
  monthlyTrend: Array<{ month: string; revenue: number; count: number }>;
}

export const revenueApi = {
  summary: (token: string, from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    return apiRequest<RevenueSummary>(`/revenue/summary?${q}`, { token });
  },

  topSales: (token: string, limit = 10) =>
    apiRequest<Array<{ id: string; dateSold: string; sellingPrice: string; buyerName: string; modeOfSale: string; vehicle: { name: string; category: string }; receipt: { receiptNumber: string } | null }>>(`/revenue/top-sales?limit=${limit}`, { token }),
};

// ── Notifications API ─────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  relatedRecordId?: string | null;
  relatedRecordType?: string | null;
}

export const notificationsApi = {
  list: (token: string, page = 1) =>
    apiRequest<PaginatedResponse<Notification> & { unreadCount: number }>(`/notifications?page=${page}`, { token }),

  unreadCount: (token: string) =>
    apiRequest<{ unreadCount: number }>('/notifications/unread-count', { token }),

  markRead: (token: string, id: string) =>
    apiRequest<Notification>(`/notifications/${id}/read`, { method: 'PATCH', token }),

  markAllRead: (token: string) =>
    apiRequest<{ message: string }>('/notifications/mark-all-read', { method: 'PATCH', token }),
};
