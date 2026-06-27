import { describe, expect, it } from 'vitest';
import { HTTP_ENVELOPE_OPTIONS } from './tokens';

describe('tokens', () => {
  it('HTTP_ENVELOPE_OPTIONS is a symbol', () => {
    expect(typeof HTTP_ENVELOPE_OPTIONS).toBe('symbol');
  });
});
