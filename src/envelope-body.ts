/**
 * Marker a handler returns when it needs extra top-level siblings hoisted
 * alongside `data` in the response envelope — e.g. `pagination` for paginated
 * collections, or a generated id for a create endpoint. The
 * {@link ResponseEnvelopeInterceptor} spreads `extras` into the envelope:
 * `{ statusCode, timestamp, ...extras, data }`.
 *
 * Handlers that need no extras return their payload directly and get the plain
 * `{ statusCode, timestamp, data }` shape.
 */
export class EnvelopeBody<T> {
  constructor(
    readonly data: T,
    readonly extras: Record<string, unknown> = {}
  ) {}
}
