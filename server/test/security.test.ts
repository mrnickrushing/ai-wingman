import assert from 'node:assert/strict';
import test from 'node:test';
import jsonwebtoken from 'jsonwebtoken';
import authRouter from '../src/routes/auth';
import { hasActivePremium, type DbAccount } from '../src/db/accounts';
import { signToken, verifyToken } from '../src/services/jwt';
import { verifyAppleIdentityToken, verifyGoogleIdentityToken } from '../src/services/oauth';

process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';

test('JWT verification rejects a token signed with another key', () => {
  const valid = signToken('account-1', 'person@example.com');
  assert.equal(verifyToken(valid)?.sub, 'account-1');

  const forged = jsonwebtoken.sign({ sub: 'account-1' }, 'wrong-secret-wrong-secret-wrong-12', {
    algorithm: 'HS256',
    issuer: 'ai-wingman-server',
    audience: 'ai-wingman-app',
  });
  assert.equal(verifyToken(forged), null);
});

test('unsigned Google and Apple identity tokens are rejected', async () => {
  const unsigned = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJhdHRhY2tlciJ9.';
  await assert.rejects(verifyGoogleIdentityToken(unsigned));
  await assert.rejects(verifyAppleIdentityToken(unsigned));
});

test('expired and unverified subscription rows do not grant premium', () => {
  const base = {
    premium: true,
    subscription_status: 'active',
    subscription_last_verified_at: new Date().toISOString(),
  } as DbAccount;

  assert.equal(hasActivePremium({
    ...base,
    subscription_expires_at: new Date(Date.now() + 60_000).toISOString(),
  }), true);
  assert.equal(hasActivePremium({
    ...base,
    subscription_expires_at: new Date(Date.now() - 60_000).toISOString(),
  }), false);
  assert.equal(hasActivePremium({
    ...base,
    subscription_last_verified_at: null,
    subscription_expires_at: null,
  }), false);
});

test('the client-writable premium route no longer exists', () => {
  const stack = (authRouter as unknown as {
    stack: Array<{ route?: { path?: string } }>;
  }).stack;
  const paths = stack.map((layer) => layer.route?.path).filter(Boolean);
  assert.equal(paths.includes('/premium'), false);
  assert.equal(paths.includes('/subscription/sync'), true);
});
