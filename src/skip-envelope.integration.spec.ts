import {
  type CanActivate,
  Controller,
  type ExecutionContext,
  Get,
  HttpException,
  type INestApplication,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  UseGuards
} from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { HttpEnvelopeModule } from './http-envelope.module';
import { SkipEnvelope } from './skip-envelope.decorator';

// End to end through Nest's real router (platform-express), because the bug
// lives in how Nest hands errors to filters: a unit test of the filter alone
// can't tell a skipped route from any other.

/** An RFC 6749 §5.2 error, the shape nestjs-oauth2-password throws. */
const rfcError = () =>
  new HttpException({ error: 'invalid_grant', error_description: 'bad credentials' }, 400);
const RFC_BODY = { error: 'invalid_grant', error_description: 'bad credentials' };

@Injectable()
class RfcGuard implements CanActivate {
  canActivate(): boolean {
    throw rfcError();
  }
}

/** A global guard: it runs before anything a controller or route declares. */
@Injectable()
class GlobalGateGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const { url } = ctx.switchToHttp().getRequest<{ url: string }>();
    if (url.endsWith('/global-gate')) throw rfcError();
    return true;
  }
}

@Controller('mixed')
class MixedController {
  @Get('ok')
  ok() {
    return { a: 1 };
  }

  @Get('error')
  error() {
    throw rfcError();
  }

  @UseGuards(RfcGuard)
  @Get('guard')
  guard() {
    return 'unreachable';
  }

  @SkipEnvelope()
  @Get('skipped-ok')
  skippedOk() {
    return { status: 'ok' };
  }

  @SkipEnvelope()
  @Get('skipped-error')
  skippedError() {
    throw rfcError();
  }

  @SkipEnvelope()
  @Get('skipped-string')
  skippedString() {
    throw new HttpException('I am a teapot', 418);
  }

  @SkipEnvelope()
  @UseGuards(RfcGuard)
  @Get('skipped-guard')
  skippedGuard() {
    return 'unreachable';
  }

  @SkipEnvelope()
  @Get('skipped-pipe/:id')
  skippedPipe(@Param('id', ParseIntPipe) id: number) {
    return id;
  }

  @SkipEnvelope()
  @Get('global-gate')
  globalGate() {
    return 'unreachable';
  }

  @SkipEnvelope()
  @Get('skipped-crash')
  skippedCrash() {
    throw new Error('boom');
  }
}

@SkipEnvelope()
@Controller('skipped')
class SkippedController {
  @Get('ok')
  ok() {
    return { status: 'ok' };
  }

  @Get('error')
  error() {
    throw rfcError();
  }

  @UseGuards(RfcGuard)
  @Get('guard')
  guard() {
    return 'unreachable';
  }
}

const logger = { error: vi.fn(), log: vi.fn(), warn: vi.fn(), debug: vi.fn(), verbose: vi.fn() };

@Module({
  imports: [HttpEnvelopeModule.forRoot({ timestamp: () => 'TS', logger })],
  controllers: [MixedController, SkippedController],
  providers: [{ provide: APP_GUARD, useClass: GlobalGateGuard }]
})
class AppModule {}

let app: INestApplication;
let base: string;

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});

afterAll(async () => {
  await app.close();
});

async function get(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${base}${path}`);
  return { status: res.status, body: await res.json() };
}

describe('@SkipEnvelope() through the real router', () => {
  describe('on a route that is not skipped', () => {
    it('envelopes the success', async () => {
      expect(await get('/mixed/ok')).toEqual({
        status: 200,
        body: { statusCode: 200, timestamp: 'TS', data: { a: 1 } }
      });
    });

    it('envelopes an error thrown in the handler', async () => {
      expect(await get('/mixed/error')).toEqual({
        status: 400,
        body: {
          statusCode: 400,
          timestamp: 'TS',
          error: 'invalid_grant',
          message: 'Http Exception'
        }
      });
    });

    it('envelopes an error thrown in a guard', async () => {
      const { status, body } = await get('/mixed/guard');
      expect(status).toBe(400);
      expect(body).toMatchObject({ statusCode: 400, timestamp: 'TS', error: 'invalid_grant' });
    });
  });

  describe('on a skipped handler', () => {
    it('sends the success as-is', async () => {
      expect(await get('/mixed/skipped-ok')).toEqual({ status: 200, body: { status: 'ok' } });
    });

    it("sends a handler's HttpException body untouched", async () => {
      expect(await get('/mixed/skipped-error')).toEqual({ status: 400, body: RFC_BODY });
    });

    it('shapes a string HttpException body the way Nest does', async () => {
      expect(await get('/mixed/skipped-string')).toEqual({
        status: 418,
        body: { statusCode: 418, message: 'I am a teapot' }
      });
    });

    it("sends a route guard's HttpException body untouched", async () => {
      expect(await get('/mixed/skipped-guard')).toEqual({ status: 400, body: RFC_BODY });
    });

    it("sends a global guard's HttpException body untouched", async () => {
      expect(await get('/mixed/global-gate')).toEqual({ status: 400, body: RFC_BODY });
    });

    it("sends a pipe's HttpException body untouched", async () => {
      expect(await get('/mixed/skipped-pipe/abc')).toEqual({
        status: 400,
        body: {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed (numeric string is expected)'
        }
      });
    });

    it('still turns a non-HTTP error into the logged generic 500', async () => {
      logger.error.mockClear();
      expect(await get('/mixed/skipped-crash')).toEqual({
        status: 500,
        body: {
          statusCode: 500,
          timestamp: 'TS',
          error: 'Internal Server Error',
          message: 'Internal server error'
        }
      });
      expect(logger.error).toHaveBeenCalledOnce();
    });
  });

  describe('on a skipped controller', () => {
    it('sends the success as-is', async () => {
      expect(await get('/skipped/ok')).toEqual({ status: 200, body: { status: 'ok' } });
    });

    it("sends a handler's HttpException body untouched", async () => {
      expect(await get('/skipped/error')).toEqual({ status: 400, body: RFC_BODY });
    });

    it("sends a guard's HttpException body untouched", async () => {
      expect(await get('/skipped/guard')).toEqual({ status: 400, body: RFC_BODY });
    });
  });
});
