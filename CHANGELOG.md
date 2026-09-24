# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](http://semver.org).

## 1.0.2 (2026-09-25)

### Fixed
- An `EnvelopeBody` now survives interceptors that rework the response payload, such as nestjs-accesscontrol's `@FilterResponse()`. It carries a map-data method under `Symbol.for('nestjs-http-envelope:map-data')` (exported as `ENVELOPE_MAP_DATA`) that returns a new body of the same class around the mapped `data`, with `extras` untouched. Before this, filtering a returned `EnvelopeBody` turned it into a plain object, and the response came out nested as `data: { data, extras }`. Additive; existing `EnvelopeBody` usage is unchanged.

## 1.0.1 (2026-09-08)

### Fixed
- Peer dependency ranges now accept NestJS 12 (`@nestjs/common`, `@nestjs/core` `^10 || ^11 || ^12`).

## 1.0.0 (2026-06-28)

- Initial release.
