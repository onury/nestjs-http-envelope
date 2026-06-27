import { describe, expect, it } from 'vitest';
import { EnvelopeBody } from './envelope-body';

describe('EnvelopeBody', () => {
  it('defaults extras to an empty object', () => {
    const b = new EnvelopeBody('payload');
    expect(b.data).toBe('payload');
    expect(b.extras).toEqual({});
  });

  it('keeps the provided extras', () => {
    const b = new EnvelopeBody([1, 2], { pagination: { total: 2 } });
    expect(b.data).toEqual([1, 2]);
    expect(b.extras).toEqual({ pagination: { total: 2 } });
  });
});
