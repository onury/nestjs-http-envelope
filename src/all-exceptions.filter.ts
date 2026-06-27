import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject
} from '@nestjs/common';
import type { ResolvedHttpEnvelopeOptions } from './options';
import { HTTP_ENVELOPE_OPTIONS } from './tokens';

/**
 * Formats every error into the standard error envelope
 * `{ statusCode, timestamp, error, message }` (field names configurable).
 * Internal details never leak: a non-HTTP exception becomes a generic 500 and is
 * logged with its stack (optionally echoed into the body via `includeStackInResponse`).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(HTTP_ENVELOPE_OPTIONS) private readonly options: ResolvedHttpEnvelopeOptions
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const request = ctx.getRequest<{ method?: string; url?: string }>();
    const {
      fields,
      timestamp,
      logger,
      deriveErrorName,
      genericError,
      genericMessage,
      includeStackInResponse
    } = this.options;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = genericError;
    let message: string | string[] = genericMessage;
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      // Stryker disable next-line ConditionalExpression, StringLiteral: for an HttpException,
      // a string getResponse() always equals exception.message, so the string vs. object
      // branches produce identical output here — this split is not behaviorally killable.
      if (typeof res === 'string') {
        message = res;
        error = deriveErrorName(exception);
      } else {
        const body = res as { message?: string | string[]; error?: string };
        message = body.message ?? exception.message;
        error = body.error ?? deriveErrorName(exception);
      }
    } else {
      // Unexpected error — log the real cause, return a generic 500.
      stack = exception instanceof Error ? exception.stack : String(exception);
      logger.error(`Unhandled exception on ${request?.method} ${request?.url}`, stack);
    }

    const out: Record<string, unknown> = {
      [fields.statusCode]: statusCode,
      [fields.timestamp]: timestamp(),
      [fields.error]: error,
      [fields.message]: message
    };
    if (includeStackInResponse && stack) out.stack = stack;

    response.status(statusCode).json(out);
  }
}
