/**
 * Well-known key of the "map-data" protocol that {@link EnvelopeBody} carries,
 * so response transformers in other packages (e.g. nestjs-accesscontrol's
 * `@FilterResponse()`) can reach the payload without importing this package.
 *
 * Contract: `body[ENVELOPE_MAP_DATA](fn)` returns a NEW body of the same class
 * holding `fn(body.data)`, with `extras` (and anything else) untouched; the
 * original body is not modified. A transformer that finds a function under this
 * key calls it instead of transforming the body object itself, so the result is
 * still an `EnvelopeBody` and the interceptor still hoists its extras.
 * `Symbol.for` makes the key the same in every package and every copy of this
 * one; consumers write `Symbol.for('nestjs-http-envelope:map-data')` themselves.
 */
export const ENVELOPE_MAP_DATA: unique symbol = Symbol.for('nestjs-http-envelope:map-data');

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

  /**
   * Map-data protocol (see {@link ENVELOPE_MAP_DATA}): a new body of the same
   * class around `fn(data)`, sharing these `extras`. A subclass whose
   * constructor takes other arguments overrides this.
   */
  [ENVELOPE_MAP_DATA]<U>(fn: (data: T) => U): EnvelopeBody<U> {
    const Body = this.constructor as new (
      data: U,
      extras: Record<string, unknown>
    ) => EnvelopeBody<U>;
    return new Body(fn(this.data), this.extras);
  }
}
