export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  isBusinessError: boolean;
  traceId?: string;
  details?: any;
}
