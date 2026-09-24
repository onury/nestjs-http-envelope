import { EXCEPTION_FILTERS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { SKIP_ENVELOPE_KEY, SkipEnvelope } from './skip-envelope.decorator';
import { SkipEnvelopeFilter } from './skip-envelope.filter';

describe('SkipEnvelope', () => {
  it('exposes a stable metadata key', () => {
    expect(SKIP_ENVELOPE_KEY).toBe('nestjs-http-envelope:skip');
  });

  it('sets the skip metadata and the skip filter on a handler', () => {
    class C {
      m() {}
    }
    const decorate = SkipEnvelope() as MethodDecorator;
    const descriptor = Object.getOwnPropertyDescriptor(C.prototype, 'm') as PropertyDescriptor;
    decorate(C.prototype, 'm', descriptor);
    expect(Reflect.getMetadata(SKIP_ENVELOPE_KEY, C.prototype.m)).toBe(true);
    expect(Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, C.prototype.m)).toEqual([
      SkipEnvelopeFilter
    ]);
  });

  it('sets the skip metadata and the skip filter on a controller', () => {
    @SkipEnvelope()
    class C {}
    expect(Reflect.getMetadata(SKIP_ENVELOPE_KEY, C)).toBe(true);
    expect(Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, C)).toEqual([SkipEnvelopeFilter]);
  });
});
