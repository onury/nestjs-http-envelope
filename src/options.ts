import { type HttpException, Logger, type LoggerService } from '@nestjs/common';

/** Envelope key names (rename any of them via {@link HttpEnvelopeOptions.fields}). */
export interface EnvelopeFieldNames {
  statusCode: string;
  timestamp: string;
  data: string;
  error: string;
  message: string;
}

/** Options accepted by {@link HttpEnvelopeModule.forRoot}. All optional. */
export interface HttpEnvelopeOptions {
  /** Produces the `timestamp` value. Default: `() => new Date().toISOString()`. */
  timestamp?: () => string;
  /** Rename any envelope keys. Defaults to the standard names. */
  fields?: Partial<EnvelopeFieldNames>;
  /** Logger for unhandled (non-HTTP) exceptions. Default: a NestJS `Logger`. */
  logger?: LoggerService;
  /** Derive the `error` reason from an `HttpException`. Default: strip `"Exception"`. */
  deriveErrorName?: (exception: HttpException) => string;
  /** `error` value for unhandled exceptions. Default: `"Internal Server Error"`. */
  genericError?: string;
  /** `message` value for unhandled exceptions. Default: `"Internal server error"`. */
  genericMessage?: string;
  /** Include the unhandled exception's stack in the response body (dev only). Default: `false`. */
  includeStackInResponse?: boolean;
  /** Register the module globally. Default: `true`. */
  isGlobal?: boolean;
}

/** Fully-populated options consumed by the interceptor and filter. */
export interface ResolvedHttpEnvelopeOptions {
  timestamp: () => string;
  fields: EnvelopeFieldNames;
  logger: LoggerService;
  deriveErrorName: (exception: HttpException) => string;
  genericError: string;
  genericMessage: string;
  includeStackInResponse: boolean;
}

const DEFAULT_FIELDS: EnvelopeFieldNames = {
  statusCode: 'statusCode',
  timestamp: 'timestamp',
  data: 'data',
  error: 'error',
  message: 'message'
};

/** Merge user options over the defaults into a fully-populated config. */
export function resolveOptions(options: HttpEnvelopeOptions = {}): ResolvedHttpEnvelopeOptions {
  return {
    timestamp: options.timestamp ?? (() => new Date().toISOString()),
    fields: { ...DEFAULT_FIELDS, ...options.fields },
    logger: options.logger ?? new Logger('HttpEnvelope'),
    deriveErrorName:
      options.deriveErrorName ?? ((exception) => exception.name.replace(/Exception$/, '')),
    genericError: options.genericError ?? 'Internal Server Error',
    genericMessage: options.genericMessage ?? 'Internal server error',
    includeStackInResponse: options.includeStackInResponse ?? false
  };
}
