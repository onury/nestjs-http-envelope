import { describe, expect, it } from 'vitest';
import { SKIP_ENVELOPE_KEY, SkipEnvelope } from './skip-envelope.decorator';

describe('SkipEnvelope', () => {
  it('exposes a stable metadata key', () => {
    expect(SKIP_ENVELOPE_KEY).toBe('nestjs-http-envelope:skip');
  });

  it('sets the skip metadata on a handler', () => {
    class C {
      m() {}
    }
    const decorate = SkipEnvelope() as MethodDecorator;
    const descriptor = Object.getOwnPropertyDescriptor(C.prototype, 'm') as PropertyDescriptor;
    decorate(C.prototype, 'm', descriptor);
    expect(Reflect.getMetadata(SKIP_ENVELOPE_KEY, C.prototype.m)).toBe(true);
  });
});
