import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { OAuth2PasswordController, OAuth2PasswordModule } from 'nestjs-oauth2-password';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpEnvelopeModule } from './http-envelope.module';
import { SkipEnvelope } from './skip-envelope.decorator';

// The real nestjs-oauth2-password token route, marked the way its README says.
// Its RFC 6749 responses, errors included, must reach the client unwrapped.
SkipEnvelope()(OAuth2PasswordController);

@SkipEnvelope()
@Controller('me')
class MeController {
  @Get()
  me() {
    return 'unreachable without a token';
  }
}

const tokenStore = {
  saveAccessToken() {},
  saveRefreshToken() {},
  findAccessToken: () => null,
  findRefreshToken: () => null,
  revokeAccessToken() {},
  revokeRefreshToken() {}
};

@Module({
  imports: [
    HttpEnvelopeModule.forRoot(),
    OAuth2PasswordModule.forRoot({
      validateUser: (username: string, password: string) =>
        username === 'ada' && password === 'secret' ? { id: 1 } : null,
      tokenStore
    })
  ],
  controllers: [MeController]
})
class AppModule {}

let app: INestApplication;
let base: string;

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});

afterAll(async () => {
  await app.close();
});

async function token(body: Record<string, string>) {
  const res = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: res.status, body: await res.json() };
}

describe('nestjs-oauth2-password under @SkipEnvelope()', () => {
  it('keeps the RFC 6749 error body, error_description included', async () => {
    expect(await token({ grant_type: 'password', username: 'ada', password: 'wrong' })).toEqual({
      status: 400,
      body: { error: 'invalid_grant', error_description: 'invalid username or password' }
    });
  });

  it('keeps the RFC 6749 token response bare', async () => {
    const { status, body } = await token({
      grant_type: 'password',
      username: 'ada',
      password: 'secret'
    });
    expect(status).toBe(200);
    expect(body).toMatchObject({ token_type: 'Bearer', access_token: expect.any(String) });
    expect(body).not.toHaveProperty('data');
  });

  it("keeps the bearer guard's rejection unwrapped on a skipped route", async () => {
    const res = await fetch(`${base}/me`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ statusCode: 401, message: 'Unauthorized' });
  });
});
