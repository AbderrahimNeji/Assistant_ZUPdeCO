export type ApiError = {
  message: string;
  statusCode?: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
};
