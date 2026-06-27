import { SetMetadata } from '@nestjs/common';

/** Reflect-metadata key set by {@link SkipEnvelope}. */
export const SKIP_ENVELOPE_KEY = 'nestjs-http-envelope:skip';

/**
 * Marks a route as exempt from the response-envelope interceptor — its return
 * value is sent as-is. Use for infra endpoints like `GET /health` whose contract
 * is a bare body with no `data`.
 */
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);
