import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';
import { findById, recordSubscriptionEvent } from '../db/accounts';
import { isRevenueCatConfigured, syncRevenueCatSubscription } from '../services/revenuecat';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const SIGNATURE_TOLERANCE_SECONDS = 300;

type RevenueCatWebhook = {
  event?: {
    id?: string;
    type?: string;
    app_user_id?: string;
    original_app_user_id?: string;
    aliases?: string[];
    transferred_from?: string[];
    transferred_to?: string[];
    environment?: string;
    event_timestamp_ms?: number;
  };
};

function safeEqual(actual: string, expected: string): boolean {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function validAuthorization(req: Request): boolean {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  return Boolean(expected && safeEqual(req.headers.authorization ?? '', expected));
}

function validHmac(req: Request, body: Buffer): boolean {
  const secret = process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
  const header = req.headers['x-revenuecat-webhook-signature'];
  if (!secret || typeof header !== 'string') return false;
  const fields = Object.fromEntries(header.split(',').map((part) => part.trim().split('=', 2)));
  const timestamp = fields.t;
  const signature = fields.v1;
  if (!timestamp || !signature || !/^\d+$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.`)
    .update(body)
    .digest('hex');
  return safeEqual(signature.toLowerCase(), expected);
}

function affectedAccountIds(payload: RevenueCatWebhook): string[] {
  const event = payload.event;
  return [...new Set([
    event?.app_user_id,
    event?.original_app_user_id,
    ...(event?.aliases ?? []),
    ...(event?.transferred_from ?? []),
    ...(event?.transferred_to ?? []),
  ].filter((value): value is string => Boolean(value)))];
}

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) return res.status(400).json({ error: 'Raw webhook body required.' });
  if (!validHmac(req, rawBody) && !validAuthorization(req)) {
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }
  if (!isRevenueCatConfigured()) {
    return res.status(503).json({ error: 'RevenueCat server API is not configured.' });
  }

  let payload: RevenueCatWebhook;
  try {
    payload = JSON.parse(rawBody.toString('utf8')) as RevenueCatWebhook;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON.' });
  }

  const event = payload.event;
  if (!event?.id || !event.type) return res.status(400).json({ error: 'Invalid RevenueCat event.' });

  const accountIds: string[] = [];
  for (const id of affectedAccountIds(payload)) {
    if (await findById(id)) accountIds.push(id);
  }

  // Fetch RevenueCat's current subscriber state instead of interpreting the
  // event in isolation. This makes retries and out-of-order events safe.
  await Promise.all(accountIds.map((id) => syncRevenueCatSubscription(id, event.id)));
  await recordSubscriptionEvent({
    id: event.id,
    accountId: accountIds[0] ?? null,
    type: event.type,
    environment: event.environment ?? null,
    eventTimestampMs: event.event_timestamp_ms ?? null,
  });
  return res.json({ ok: true });
}));

export default router;
