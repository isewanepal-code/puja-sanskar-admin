export type ApiErrorOptions = {
  status: number;
  code?: string;
  details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);

    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}
