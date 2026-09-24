import { HttpException, Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { type HttpEnvelopeOptions, resolveOptions } from './options';
import { SkipEnvelopeFilter } from './skip-envelope.filter';

function fakeLogger() {
  return { error: vi.fn(), log: vi.fn(), warn: vi.fn(), debug: vi.fn(), verbose: vi.fn() };
}

function run(exception: unknown, opts?: HttpEnvelopeOptions) {
  const filter = new SkipEnvelopeFilter(opts && resolveOptions(opts));
  let captured: { code: number; body: unknown } | undefined;
  const res = {
    status: (code: number) => ({
      json: (body: unknown) => {
        captured = { code, body };
      }
    })
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({}) })
  } as any;
  filter.catch(exception, host);
  return captured!;
}

describe('SkipEnvelopeFilter', () => {
  it('sends an object body as-is, with the exception status', () => {
    const body = { error: 'invalid_grant', error_description: 'nope' };
    expect(run(new HttpException(body, 400))).toEqual({ code: 400, body });
  });

  it('sends an array body as-is', () => {
    expect(run(new HttpException(['a', 'b'], 422))).toEqual({ code: 422, body: ['a', 'b'] });
  });

  it('shapes a string body as { statusCode, message }', () => {
    expect(run(new HttpException('teapot', 418))).toEqual({
      code: 418,
      body: { statusCode: 418, message: 'teapot' }
    });
  });

  it('shapes a null body as { statusCode, message }', () => {
    expect(run(new HttpException(null as any, 409))).toEqual({
      code: 409,
      body: { statusCode: 409, message: null }
    });
  });

  it('envelopes a non-HTTP error with the injected options', () => {
    const logger = fakeLogger();
    const { code, body } = run(new Error('boom'), { logger, genericError: 'Oops' });
    expect(code).toBe(500);
    expect(body).toMatchObject({ statusCode: 500, error: 'Oops' });
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('falls back to the default options when none are injected', () => {
    const spy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    try {
      const { code, body } = run(new Error('boom'));
      expect(code).toBe(500);
      expect(body).toEqual({
        statusCode: 500,
        timestamp: expect.any(String),
        error: 'Internal Server Error',
        message: 'Internal server error'
      });
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      spy.mockRestore();
    }
  });
});
