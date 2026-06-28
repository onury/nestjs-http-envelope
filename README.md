# nestjs-http-envelope

<p align="center">
  <a href="https://github.com/onury/nestjs-http-envelope/actions/workflows/ci.yml"><img src="https://github.com/onury/nestjs-http-envelope/actions/workflows/ci.yml/badge.svg" alt="build" /></a>
  <a href="#"><img src="https://img.shields.io/badge/coverage-100%25-2BB150?logo=vitest&logoColor=%23FDC72B&style=flat" alt="coverage" /></a>
  <a href="https://stryker-mutator.io/"><img src="https://img.shields.io/badge/mutation-100%25-2BB150?style=flat" alt="mutation score" /></a>
  <a href="https://www.npmjs.com/package/nestjs-http-envelope"><img src="https://img.shields.io/npm/v/nestjs-http-envelope.svg?style=flat&label=&color=%23C6234B&logo=npm" alt="version" /></a>
  <a href="https://img.shields.io/badge/deps-zero-2BB150"><img src="https://img.shields.io/badge/deps-zero-2BB150?style=flat" alt="zero dependencies" /></a>
  <a href="https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7"><img src="https://img.shields.io/badge/ESM-F7DF1E?style=flat" alt="ESM" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TS-3260C7?style=flat" alt="TypeScript" /></a>
  <a href="https://github.com/onury/nestjs-http-envelope/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="license" /></a>
</p>

A uniform **response & error envelope** for [NestJS](https://nestjs.com): one success shape, one error shape, attribute hoisting for pagination, and an opt-out — all configurable, registered with a single `forRoot()`.

> 🔆 **[ESM](https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7)-only.** Requires Node ≥ 20 and NestJS 10 / 11.

```jsonc
// success
{ "statusCode": 200, "timestamp": "2026-06-28T…Z", "data": { … } }
// success + hoisted extras (e.g. pagination)
{ "statusCode": 200, "timestamp": "…", "pagination": { "total": 142 }, "data": [ … ] }
// error (any thrown exception)
{ "statusCode": 404, "timestamp": "…", "error": "Not Found", "message": "Item not found" }
```

## Install

```bash
npm install nestjs-http-envelope
```

`@nestjs/common`, `@nestjs/core`, `reflect-metadata`, and `rxjs` are peer dependencies (already present in any Nest app).

## Quick start

Register once — the interceptor (success) and the all-exceptions filter (error) are wired globally for you:

```ts
import { Module } from '@nestjs/common';
import { HttpEnvelopeModule } from 'nestjs-http-envelope';

@Module({
  imports: [HttpEnvelopeModule.forRoot()],
})
export class AppModule {}
```

Handlers just return their data — it gets wrapped:

```ts
@Get(':id')
findOne(@Param('id') id: string) {
  return this.items.find(id); // → { statusCode, timestamp, data }
}
```

**Pagination / extra top-level fields** — return an `EnvelopeBody`; its `extras` are hoisted as siblings of `data`:

```ts
import { EnvelopeBody } from 'nestjs-http-envelope';

@Get()
list(@Query() q: ListDto) {
  const [data, total] = await this.items.page(q);
  return new EnvelopeBody(data, { pagination: { total, page: q.page } });
}
```

**Opt out** for bare endpoints (e.g. health checks) with `@SkipEnvelope()`:

```ts
import { SkipEnvelope } from 'nestjs-http-envelope';

@SkipEnvelope()
@Get('health')
health() {
  return { status: 'ok' }; // sent as-is
}
```

**Errors** are formatted automatically — `HttpException`s keep their status/message; anything else becomes a logged generic 500 with no internal details leaked.

## Configuration

Everything is optional — `forRoot()` uses sensible defaults.

```ts
HttpEnvelopeModule.forRoot({
  timestamp: () => new Date().toISOString(), // timestamp generator
  fields: { data: 'result' },                // rename any envelope key
  logger: myLogger,                          // LoggerService for unhandled errors
  deriveErrorName: (e) => e.name,            // map HttpException → `error`
  genericError: 'Internal Server Error',     // `error` for unhandled exceptions
  genericMessage: 'Internal server error',   // `message` for unhandled exceptions
  includeStackInResponse: false,             // echo the stack into the body (dev only)
  isGlobal: true,                            // register globally (default)
});
```

| Option | Default | Description |
| --- | --- | --- |
| `timestamp` | `() => new Date().toISOString()` | Produces the `timestamp` value |
| `fields` | standard names | Rename any of `statusCode`/`timestamp`/`data`/`error`/`message` |
| `logger` | NestJS `Logger` | Logger for unhandled (non-HTTP) exceptions |
| `deriveErrorName` | strip `"Exception"` | Derive `error` from an `HttpException` |
| `genericError` | `"Internal Server Error"` | `error` for unhandled exceptions |
| `genericMessage` | `"Internal server error"` | `message` for unhandled exceptions |
| `includeStackInResponse` | `false` | Include the unhandled exception's stack in the body (dev only) |
| `isGlobal` | `true` | Register the module globally |

## Per-route use

Both the interceptor and filter are also exported, so you can apply them per-route instead of globally:

```ts
import { UseInterceptors, UseFilters } from '@nestjs/common';
import { ResponseEnvelopeInterceptor, AllExceptionsFilter } from 'nestjs-http-envelope';

@UseInterceptors(ResponseEnvelopeInterceptor)
@UseFilters(AllExceptionsFilter)
@Controller('items')
export class ItemsController {}
```

## API

**Module**

| Export | Description |
| --- | --- |
| `HttpEnvelopeModule.forRoot(options?)` | Registers the interceptor + filter globally (`APP_INTERCEPTOR`/`APP_FILTER`). See [Configuration](#configuration). |

**Building blocks**

| Export | Description |
| --- | --- |
| `ResponseEnvelopeInterceptor` | Wraps successful responses in the success envelope. Exported for per-route `@UseInterceptors`. |
| `AllExceptionsFilter` | Formats thrown exceptions into the error envelope. Exported for per-route `@UseFilters`. |
| `EnvelopeBody` | Return `new EnvelopeBody(data, extras)` from a handler to hoist `extras` (e.g. `pagination`) beside `data`. |

**Opt-out**

| Export | Description |
| --- | --- |
| `@SkipEnvelope()` | Marks a route/controller as exempt — its return value is sent as-is. |
| `SKIP_ENVELOPE_KEY` | The metadata key `@SkipEnvelope()` sets (for custom reflection). |

**Advanced & types**

| Export | Description |
| --- | --- |
| `HTTP_ENVELOPE_OPTIONS` | DI token holding the resolved options (inject for custom wiring). |
| `resolveOptions(options?)` | Merge partial options over the defaults → `ResolvedHttpEnvelopeOptions`. |
| `HttpEnvelopeOptions`, `ResolvedHttpEnvelopeOptions`, `EnvelopeFieldNames` | Option types. |
| `ResponseEnvelope<T>`, `ErrorEnvelope` | The default success / error envelope shapes. |

## Related Projects

- [**nestjs-accesscontrol**](https://github.com/onury/nestjs-accesscontrol) — The official NestJS integration for [AccessControl v3](https://github.com/onury/accesscontrol): RBAC + ABAC with fluent CRUD decorators and attribute filtering.
- [**nestjs-configuard**](https://github.com/onury/nestjs-configuard) — The NestJS integration for [configuard](https://github.com/onury/configuard): DB-backed, typed, ABAC-filtered runtime config with live reload.
- [**accesscontrol**](https://github.com/onury/accesscontrol) — Role & attribute-based access control (RBAC + ABAC) for Node.js.
- [**configuard**](https://github.com/onury/configuard) — Turn flat config rows from a database table into a nested, typed configuration object — with `${...}` templating and accessor-based (ABAC) filtering.
- [**notation**](https://github.com/onury/notation) — Read, modify, and filter the contents of objects and arrays via dot/bracket notation strings or glob patterns.

## License

[MIT](./LICENSE) © Onur Yıldırım
