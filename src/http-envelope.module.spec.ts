import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpEnvelopeModule } from './http-envelope.module';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';
import { HTTP_ENVELOPE_OPTIONS } from './tokens';

function providerFor(mod: { providers?: any[] }, token: unknown): any {
  return (mod.providers ?? []).find((p) => p?.provide === token);
}

describe('HttpEnvelopeModule.forRoot', () => {
  it('registers options, the interceptor, and the filter globally', () => {
    const mod = HttpEnvelopeModule.forRoot();
    expect(mod.module).toBe(HttpEnvelopeModule);
    expect(mod.global).toBe(true);

    expect(mod.providers).toContain(ResponseEnvelopeInterceptor);
    expect(mod.providers).toContain(AllExceptionsFilter);
    expect(providerFor(mod, APP_INTERCEPTOR).useExisting).toBe(ResponseEnvelopeInterceptor);
    expect(providerFor(mod, APP_FILTER).useExisting).toBe(AllExceptionsFilter);

    expect(mod.exports).toEqual([
      HTTP_ENVELOPE_OPTIONS,
      ResponseEnvelopeInterceptor,
      AllExceptionsFilter
    ]);
  });

  it('resolves options into the HTTP_ENVELOPE_OPTIONS provider (defaults when omitted)', () => {
    const mod = HttpEnvelopeModule.forRoot();
    expect(providerFor(mod, HTTP_ENVELOPE_OPTIONS).useValue.genericError).toBe(
      'Internal Server Error'
    );
  });

  it('passes options through resolveOptions', () => {
    const mod = HttpEnvelopeModule.forRoot({ genericError: 'Oops' });
    expect(providerFor(mod, HTTP_ENVELOPE_OPTIONS).useValue.genericError).toBe('Oops');
  });

  it('honors isGlobal: false', () => {
    expect(HttpEnvelopeModule.forRoot({ isGlobal: false }).global).toBe(false);
  });
});
