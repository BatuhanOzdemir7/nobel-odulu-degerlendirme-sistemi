import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../core/models/records';

export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as Partial<ApiError> | null;
    return body?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'İşlem sırasında beklenmeyen bir hata oluştu.';
}
