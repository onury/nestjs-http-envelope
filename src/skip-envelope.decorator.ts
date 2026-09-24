import { applyDecorators, SetMetadata, UseFilters } from '@nestjs/common';
import { SkipEnvelopeFilter } from './skip-envelope.filter';

/** Reflect-metadata key set by {@link SkipEnvelope}. */
export const SKIP_ENVELOPE_KEY = 'nestjs-http-envelope:skip';

/**
 * Marks a route or controller as exempt from the envelope, both ways. Its return
 * value is sent as-is, and an `HttpException` it throws (from a guard, a pipe or
 * the handler) is sent with its own status and body, the way Nest would send it.
 * Use for endpoints with a contract of their own: `GET /health`, or RFC 6749
 * token routes whose errors must stay `{ error, error_description }`.
 */
export const SkipEnvelope = () =>
  applyDecorators(SetMetadata(SKIP_ENVELOPE_KEY, true), UseFilters(SkipEnvelopeFilter));
