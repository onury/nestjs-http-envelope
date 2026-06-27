import { BadRequestException, Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { resolveOptions } from './options';

describe('resolveOptions', () => {
  it('applies defaults when called with no argument', () => {
    const o = resolveOptions();
    expect(typeof o.timestamp()).toBe('string');
    expect(o.fields).toEqual({
      statusCode: 'statusCode',
      timestamp: 'timestamp',
      data: 'data',
      error: 'error',
      message: 'message'
    });
    expect(o.logger).toBeInstanceOf(Logger);
    expect((o.logger as { context?: string }).context).toBe('HttpEnvelope');
    expect(o.deriveErrorName(new BadRequestException())).toBe('BadRequest');
    // Only a *trailing* "Exception" is stripped (anchored regex).
    expect(o.deriveErrorName({ name: 'ExceptionalCase' } as never)).toBe('ExceptionalCase');
    expect(o.genericError).toBe('Internal Server Error');
    expect(o.genericMessage).toBe('Internal server error');
    expect(o.includeStackInResponse).toBe(false);
  });

  it('produces an ISO-8601 default timestamp', () => {
    const ts = resolveOptions().timestamp();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
  });

  it('honors every override', () => {
    const logger = {
      error: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn()
    };
    const deriveErrorName = () => 'X';
    const o = resolveOptions({
      timestamp: () => 'FIXED',
      logger,
      deriveErrorName,
      genericError: 'Boom',
      genericMessage: 'boom',
      includeStackInResponse: true
    });
    expect(o.timestamp()).toBe('FIXED');
    expect(o.logger).toBe(logger);
    expect(o.deriveErrorName).toBe(deriveErrorName);
    expect(o.genericError).toBe('Boom');
    expect(o.genericMessage).toBe('boom');
    expect(o.includeStackInResponse).toBe(true);
  });

  it('merges partial field overrides over the defaults', () => {
    const o = resolveOptions({ fields: { data: 'result', error: 'reason' } });
    expect(o.fields).toEqual({
      statusCode: 'statusCode',
      timestamp: 'timestamp',
      data: 'result',
      error: 'reason',
      message: 'message'
    });
  });
});
