export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiErrorDetails = {
  code: string;
  details: unknown[];
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  error: ApiErrorDetails;
  path?: string;
  timestamp?: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
