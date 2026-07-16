import crypto from 'crypto';
import axios from 'axios';
import jwt, { type JwtHeader, type JwtPayload } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client();
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

// These identifiers are public OAuth configuration, not secrets. Environment
// variables can replace/extend them without a code change when another client
// is added.
const DEFAULT_GOOGLE_AUDIENCES = [
  '734907398246-8sviv3dbi0siu18p33mjuromspdi1rbr.apps.googleusercontent.com',
  '734907398246-e232dsef4fbfuc6kc6tsictqurgl28vn.apps.googleusercontent.com',
  '98129298079-p7q7vlrrj4s5t68r2a0qigqtd1p8guqj.apps.googleusercontent.com',
  '98129298079-aj8fdiufoqpv90f9r8l724rnsroujesi.apps.googleusercontent.com',
];
const DEFAULT_APPLE_AUDIENCES = ['com.rushingtechnologies.aiwingman'];

type VerifiedIdentity = {
  subject: string;
  email: string | null;
  name: string | null;
};

type AppleClaims = JwtPayload & {
  sub?: string;
  email?: string;
  email_verified?: boolean | 'true' | 'false';
};

type AppleJwk = crypto.webcrypto.JsonWebKey & { kid?: string; alg?: string; use?: string };

let appleKeys = new Map<string, crypto.KeyObject>();
let appleKeysExpireAt = 0;

function configuredList(name: string, defaults: string[]): string[] {
  const configured = process.env[name]
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return configured?.length ? configured : defaults;
}

function cacheMaxAgeMillis(cacheControl: string | undefined): number {
  const seconds = Number(cacheControl?.match(/(?:^|,)\s*max-age=(\d+)/i)?.[1] ?? 3600);
  return Math.max(60, Math.min(seconds, 86_400)) * 1000;
}

async function refreshAppleKeys(): Promise<void> {
  const response = await axios.get<{ keys?: AppleJwk[] }>(APPLE_JWKS_URL, {
    timeout: 5000,
    validateStatus: (status) => status === 200,
  });
  const next = new Map<string, crypto.KeyObject>();
  for (const jwk of response.data.keys ?? []) {
    if (!jwk.kid || jwk.kty !== 'RSA' || (jwk.alg && jwk.alg !== 'RS256')) continue;
    next.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: 'jwk' }));
  }
  if (next.size === 0) throw new Error('Apple returned no usable signing keys.');
  appleKeys = next;
  const cacheControl = response.headers['cache-control'];
  appleKeysExpireAt = Date.now() + cacheMaxAgeMillis(typeof cacheControl === 'string' ? cacheControl : undefined);
}

async function appleSigningKey(header: JwtHeader): Promise<crypto.KeyObject> {
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported Apple token header.');
  if (Date.now() >= appleKeysExpireAt || !appleKeys.has(header.kid)) {
    await refreshAppleKeys();
  }
  const key = appleKeys.get(header.kid);
  if (!key) throw new Error('Apple token references an unknown signing key.');
  return key;
}

export async function verifyGoogleIdentityToken(idToken: string): Promise<VerifiedIdentity> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: configuredList('GOOGLE_CLIENT_IDS', DEFAULT_GOOGLE_AUDIENCES),
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error('Google token is missing its subject.');
  return {
    subject: payload.sub,
    email: payload.email && payload.email_verified ? payload.email.trim().toLowerCase() : null,
    name: payload.name?.trim() || null,
  };
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<VerifiedIdentity> {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || typeof decoded === 'string') throw new Error('Malformed Apple identity token.');
  const key = await appleSigningKey(decoded.header);
  const audiences = configuredList('APPLE_CLIENT_IDS', DEFAULT_APPLE_AUDIENCES);
  const payload = jwt.verify(identityToken, key, {
    algorithms: ['RS256'],
    issuer: APPLE_ISSUER,
    audience: [audiences[0], ...audiences.slice(1)],
  }) as AppleClaims;
  if (!payload.sub) throw new Error('Apple token is missing its subject.');
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  return {
    subject: payload.sub,
    email: payload.email && emailVerified ? payload.email.trim().toLowerCase() : null,
    // Apple deliberately does not include the user's name in the signed token.
    name: null,
  };
}
