import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';

describe('ApiError', () => {
  it('maps codes to HTTP status', () => {
    expect(new ApiError('forbidden', 'nope').status).toBe(403);
    expect(new ApiError('validation_failed', 'bad').status).toBe(422);
  });

  it('serialises to the standard envelope, omitting empty details', () => {
    expect(new ApiError('not_found', 'Itinerary not found').toBody()).toEqual({
      error: { code: 'not_found', message: 'Itinerary not found' },
    });
    expect(new ApiError('conflict', 'Duplicate', { field: 'slug' }).toBody()).toEqual({
      error: { code: 'conflict', message: 'Duplicate', details: { field: 'slug' } },
    });
  });
});
