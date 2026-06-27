import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { EnvelopeBody } from './envelope-body';
import { resolveOptions } from './options';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';
import { SkipEnvelope } from './skip-envelope.decorator';

class Ctrl {
  plain() {}
  @SkipEnvelope() raw() {}
}

function ctx(handler: unknown, statusCode = 200) {
  return {
    getHandler: () => handler,
    getClass: () => Ctrl,
    switchToHttp: () => ({ getResponse: () => ({ statusCode }) })
  } as any;
}

const next = <T>(payload: T) => ({ handle: () => of(payload) });

describe('ResponseEnvelopeInterceptor', () => {
  const make = (opts = {}) =>
    new ResponseEnvelopeInterceptor(new Reflector(), resolveOptions(opts));

  it('wraps a plain payload as { statusCode, timestamp, data }', async () => {
    const i = make({ timestamp: () => 'TS' });
    const out = await firstValueFrom(i.intercept(ctx(Ctrl.prototype.plain, 201), next({ id: 1 })));
    expect(out).toEqual({ statusCode: 201, timestamp: 'TS', data: { id: 1 } });
  });

  it('hoists EnvelopeBody extras alongside data', async () => {
    const i = make({ timestamp: () => 'TS' });
    const out = await firstValueFrom(
      i.intercept(
        ctx(Ctrl.prototype.plain),
        next(new EnvelopeBody([1, 2], { pagination: { total: 2 } }))
      )
    );
    expect(out).toEqual({
      statusCode: 200,
      timestamp: 'TS',
      pagination: { total: 2 },
      data: [1, 2]
    });
  });

  it('passes through @SkipEnvelope() routes untouched', async () => {
    const i = make();
    const payload = { health: 'ok' };
    const out = await firstValueFrom(i.intercept(ctx(Ctrl.prototype.raw), next(payload)));
    expect(out).toBe(payload);
  });

  it('respects custom field names', async () => {
    const i = make({ timestamp: () => 'TS', fields: { data: 'result', statusCode: 'code' } });
    const out = await firstValueFrom(i.intercept(ctx(Ctrl.prototype.plain, 200), next('x')));
    expect(out).toEqual({ code: 200, timestamp: 'TS', result: 'x' });
  });
});
