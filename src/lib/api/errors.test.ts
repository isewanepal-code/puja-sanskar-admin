import { describe, expect, it } from 'vitest';

import { ApiError, fieldErrors, isApiError, movedSlug, toApiError } from './errors';

const envelope = (code: string, details: unknown[] = []) => ({
  success: false,
  message: 'English for staff',
  error: { code, details },
  requestId: 'req-1',
});

describe('API errors', () => {
  it('should keep the code, details and request id of an error envelope', () => {
    const error = toApiError(409, envelope('CART_CHANGED'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'CART_CHANGED', requestId: 'req-1' });
    expect(isApiError(error, 'CART_CHANGED')).toBe(true);
    expect(isApiError(error, 'CART_EMPTY')).toBe(false);
  });

  it('should name an answer that is no envelope', () => {
    expect(toApiError(502, '<html>').code).toBe('INVALID_RESPONSE');
  });

  it('should find the new slug of a moved page', () => {
    expect(movedSlug(toApiError(301, envelope('PRODUCT_MOVED', [{ slug: 'kapur' }])))).toBe(
      'kapur',
    );
    expect(movedSlug(toApiError(404, envelope('PRODUCT_NOT_FOUND')))).toBeNull();
  });

  it('should put validation messages on their fields', () => {
    const error = toApiError(
      400,
      envelope('VALIDATION_ERROR', [{ field: 'phone', code: 'matches', message: 'Bad phone' }]),
    );
    expect(fieldErrors(error)).toEqual({ phone: 'Bad phone' });
  });
});
