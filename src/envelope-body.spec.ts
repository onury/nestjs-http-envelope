import { describe, expect, it } from 'vitest';
import { ENVELOPE_MAP_DATA, EnvelopeBody } from './envelope-body';

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

describe('EnvelopeBody map-data protocol', () => {
  it('uses the registered, cross-package symbol key', () => {
    expect(ENVELOPE_MAP_DATA).toBe(Symbol.for('nestjs-http-envelope:map-data'));
  });

  it('returns a new EnvelopeBody around the mapped data, extras untouched', () => {
    const extras = { pagination: { total: 2 } };
    const b = new EnvelopeBody([1, 2], extras);
    const seen: unknown[] = [];
    const m = b[ENVELOPE_MAP_DATA]((d) => {
      seen.push(d);
      return d.map((n) => n * 10);
    });
    expect(seen).toEqual([[1, 2]]);
    expect(m).toBeInstanceOf(EnvelopeBody);
    expect(m).not.toBe(b);
    expect(m.data).toEqual([10, 20]);
    expect(m.extras).toBe(extras);
    expect(b.data).toEqual([1, 2]);
  });

  it('rebuilds a subclass as that subclass', () => {
    class Page<T> extends EnvelopeBody<T> {}
    const m = new Page('x', { a: 1 })[ENVELOPE_MAP_DATA]((d) => `${d}!`);
    expect(m).toBeInstanceOf(Page);
    expect(m.data).toBe('x!');
    expect(m.extras).toEqual({ a: 1 });
  });
});
