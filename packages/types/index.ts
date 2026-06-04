// Re-export generated API types once codegen has run
// export * from './generated/api';

// Shared manual types
export type ApiError = {
  statusCode: number;
  message: string;
  error?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
