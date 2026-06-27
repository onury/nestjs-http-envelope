import { BadRequestException, HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { type HttpEnvelopeOptions, resolveOptions } from './options';

function fakeLogger() {
  return { error: vi.fn(), log: vi.fn(), warn: vi.fn(), debug: vi.fn(), verbose: vi.fn() };
}

function run(
  exception: unknown,
  opts: HttpEnvelopeOptions = {},
  request: unknown = { method: 'GET', url: '/x' }
) {
  const filter = new AllExceptionsFilter(resolveOptions(opts));
  let captured: { code: number; body: Record<string, unknown> } | undefined;
  const res = {
    status: (code: number) => ({
      json: (body: Record<string, unknown>) => {
        captured = { code, body };
      }
    })
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => request })
  } as any;
  filter.catch(exception, host);
  return captured!;
}

describe('AllExceptionsFilter', () => {
  it('formats an HttpException with a string response', () => {
    const { code, body } = run(new HttpException('plain text', 400), { timestamp: () => 'TS' });
    expect(code).toBe(400);
    expect(body).toEqual({
      statusCode: 400,
      timestamp: 'TS',
      error: 'Http', // "HttpException" → strip "Exception"
      message: 'plain text'
    });
  });

  it('uses message + error from an object response', () => {
    const { code, body } = run(new BadRequestException('bad input'));
    expect(code).toBe(400);
    expect(body.message).toBe('bad input');
    expect(body.error).toBe('Bad Request');
  });

  it('falls back to exception.message and derived name when the object omits them', () => {
    const ex = new HttpException({ foo: 1 }, 418);
    const { code, body } = run(ex);
    expect(code).toBe(418);
    expect(body.message).toBe(ex.message);
    expect(body.error).toBe('Http');
  });

  it('turns a non-HTTP Error into a logged generic 500', () => {
    const logger = fakeLogger();
    const { code, body } = run(new Error('boom'), { logger });
    expect(code).toBe(500);
    expect(body).toEqual({
      statusCode: 500,
      timestamp: expect.any(String),
      error: 'Internal Server Error',
      message: 'Internal server error'
    });
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('stringifies a non-Error throw for the log', () => {
    const logger = fakeLogger();
    const { code } = run('weird-string', { logger });
    expect(code).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('/x'), 'weird-string');
  });

  it('handles a missing request object', () => {
    const logger = fakeLogger();
    run(new Error('boom'), { logger }, null);
    expect(logger.error).toHaveBeenCalledWith(
      'Unhandled exception on undefined undefined',
      expect.any(String)
    );
  });

  it('echoes the stack into the body when includeStackInResponse is set', () => {
    const err = new Error('boom');
    const { body } = run(err, { logger: fakeLogger(), includeStackInResponse: true });
    expect(body.stack).toBe(err.stack);
  });

  it('omits the stack for an HttpException even when includeStackInResponse is set', () => {
    const { body } = run(new BadRequestException('x'), { includeStackInResponse: true });
    expect(body).not.toHaveProperty('stack');
  });

  it('omits the stack by default', () => {
    const { body } = run(new Error('boom'), { logger: fakeLogger() });
    expect(body).not.toHaveProperty('stack');
  });

  it('respects custom field names, timestamp, messages, and error derivation', () => {
    const { body } = run(new HttpException('s', 400), {
      timestamp: () => 'TS',
      fields: { statusCode: 'code', timestamp: 'ts', error: 'reason', message: 'detail' },
      deriveErrorName: () => 'CUSTOM'
    });
    expect(body).toEqual({ code: 400, ts: 'TS', reason: 'CUSTOM', detail: 's' });
  });

  it('uses custom generic error/message for unhandled exceptions', () => {
    const { body } = run(new Error('x'), {
      logger: fakeLogger(),
      genericError: 'Oops',
      genericMessage: 'something broke'
    });
    expect(body.error).toBe('Oops');
    expect(body.message).toBe('something broke');
  });
});
