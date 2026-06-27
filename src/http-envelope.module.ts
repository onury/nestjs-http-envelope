import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { type HttpEnvelopeOptions, resolveOptions } from './options';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';
import { HTTP_ENVELOPE_OPTIONS } from './tokens';

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS dynamic modules are classes with a static forRoot
export class HttpEnvelopeModule {
  /**
   * Registers the response-envelope interceptor and all-exceptions filter
   * globally (via `APP_INTERCEPTOR` / `APP_FILTER`). Both are also exported, so
   * they can be applied per-route with `@UseInterceptors` / `@UseFilters`.
   */
  static forRoot(options: HttpEnvelopeOptions = {}): DynamicModule {
    const providers: Provider[] = [
      { provide: HTTP_ENVELOPE_OPTIONS, useValue: resolveOptions(options) },
      ResponseEnvelopeInterceptor,
      AllExceptionsFilter,
      { provide: APP_INTERCEPTOR, useExisting: ResponseEnvelopeInterceptor },
      { provide: APP_FILTER, useExisting: AllExceptionsFilter }
    ];

    return {
      module: HttpEnvelopeModule,
      global: options.isGlobal ?? true,
      providers,
      exports: [HTTP_ENVELOPE_OPTIONS, ResponseEnvelopeInterceptor, AllExceptionsFilter]
    };
  }
}
