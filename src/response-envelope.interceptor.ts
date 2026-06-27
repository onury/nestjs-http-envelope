import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import { EnvelopeBody } from './envelope-body';
import type { ResolvedHttpEnvelopeOptions } from './options';
import { SKIP_ENVELOPE_KEY } from './skip-envelope.decorator';
import { HTTP_ENVELOPE_OPTIONS } from './tokens';

/**
 * Wraps every successful response in the standard envelope
 * `{ statusCode, timestamp, data }` (field names configurable). Routes marked
 * `@SkipEnvelope()` pass through untouched. When a handler returns an
 * {@link EnvelopeBody}, its `extras` are hoisted as top-level siblings —
 * `{ statusCode, timestamp, ...extras, data }` (e.g. `pagination`).
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(HTTP_ENVELOPE_OPTIONS) private readonly options: ResolvedHttpEnvelopeOptions
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (skip) return next.handle();

    const response = context.switchToHttp().getResponse<{ statusCode: number }>();
    const { fields, timestamp } = this.options;

    return next.handle().pipe(
      map((payload) => {
        const out: Record<string, unknown> = {
          [fields.statusCode]: response.statusCode,
          [fields.timestamp]: timestamp()
        };
        if (payload instanceof EnvelopeBody) {
          Object.assign(out, payload.extras);
          out[fields.data] = payload.data;
        } else {
          out[fields.data] = payload;
        }
        return out;
      })
    );
  }
}
