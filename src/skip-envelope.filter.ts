import {
  type ArgumentsHost,
  Catch,
  HttpException,
  Inject,
  Injectable,
  Optional
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { type ResolvedHttpEnvelopeOptions, resolveOptions } from './options';
import { HTTP_ENVELOPE_OPTIONS } from './tokens';

/**
 * The error half of {@link SkipEnvelope}. `@SkipEnvelope()` attaches it to the
 * route (or controller) it marks, with `@UseFilters`, so it outranks the global
 * {@link AllExceptionsFilter} there.
 *
 * Why a route-scoped filter instead of the global one reading the skip key: Nest
 * hands a filter a bare `ExecutionContextHost([req, res, next])`, whose
 * `getHandler()` and `getClass()` are `null`, so the global filter cannot tell
 * which route threw. Marking the request from the interceptor doesn't work
 * either; guards run before any interceptor. A filter declared on the route sits
 * in that route's own exceptions handler, which catches everything the route
 * runs: guards (global ones included), pipes, interceptors and the handler.
 *
 * An `HttpException` goes out as Nest's own filter would send it: its status,
 * and its body as-is (a string body becomes `{ statusCode, message }`). Anything
 * else still becomes the logged, generic 500 envelope; there is no body of its
 * own worth sending, and its internals must not leak.
 */
@Catch()
@Injectable()
export class SkipEnvelopeFilter extends AllExceptionsFilter {
  constructor(
    // Optional: the controller's module may not see the global options (e.g.
    // `isGlobal: false`). The defaults then shape the fallback 500.
    @Optional() @Inject(HTTP_ENVELOPE_OPTIONS) options?: ResolvedHttpEnvelopeOptions
  ) {
    super(options ?? resolveOptions());
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (!(exception instanceof HttpException)) return super.catch(exception, host);

    const statusCode = exception.getStatus();
    const res = exception.getResponse();
    const body = typeof res === 'object' && res !== null ? res : { statusCode, message: res };
    host
      .switchToHttp()
      .getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>()
      .status(statusCode)
      .json(body);
  }
}
