import axios from 'axios';
import { updateSubscriptionState, type DbAccount, type SubscriptionState } from '../db/accounts';

const API_BASE = 'https://api.revenuecat.com/v1';

type RevenueCatEntitlement = {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string | null;
  purchase_date?: string | null;
};

type RevenueCatSubscription = {
  period_type?: string | null;
  store?: string | null;
  is_sandbox?: boolean;
};

type RevenueCatCustomer = {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement>;
    subscriptions?: Record<string, RevenueCatSubscription>;
  };
};

function requiredApiKey(): string {
  const key = process.env.REVENUECAT_SECRET_API_KEY;
  if (!key) throw new Error('REVENUECAT_SECRET_API_KEY is not configured.');
  return key;
}

function entitlementId(): string {
  return process.env.REVENUECAT_ENTITLEMENT_ID?.trim() || 'pro';
}

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function subscriptionState(customer: RevenueCatCustomer, eventId?: string | null): SubscriptionState {
  const entitlement = entitlementId();
  const item = customer.subscriber?.entitlements?.[entitlement];
  if (!item) {
    return {
      active: false,
      status: 'inactive',
      entitlement,
      productId: null,
      periodType: null,
      store: null,
      environment: null,
      expiresAt: null,
      eventId,
    };
  }

  const productId = item.product_identifier ?? null;
  const purchase = productId ? customer.subscriber?.subscriptions?.[productId] : undefined;
  const expiresAt = timestamp(item.expires_date);
  const graceExpiresAt = timestamp(item.grace_period_expires_date);
  const effectiveExpiresAt = Math.max(expiresAt ?? 0, graceExpiresAt ?? 0) || null;
  const lifetime = item.expires_date === null;
  const active = lifetime || (effectiveExpiresAt !== null && effectiveExpiresAt > Date.now());
  const inGracePeriod = active
    && graceExpiresAt !== null
    && graceExpiresAt > Date.now()
    && (expiresAt === null || expiresAt <= Date.now());
  const periodType = purchase?.period_type ?? null;
  const status: SubscriptionState['status'] = !active
    ? 'expired'
    : inGracePeriod
      ? 'grace_period'
      : periodType === 'trial'
        ? 'trial'
        : 'active';

  return {
    active,
    status,
    entitlement,
    productId,
    periodType,
    store: purchase?.store ?? null,
    environment: purchase ? (purchase.is_sandbox ? 'sandbox' : 'production') : null,
    expiresAt: effectiveExpiresAt ? new Date(effectiveExpiresAt).toISOString() : null,
    eventId,
  };
}

export function isRevenueCatConfigured(): boolean {
  return Boolean(process.env.REVENUECAT_SECRET_API_KEY);
}

export async function syncRevenueCatSubscription(
  accountId: string,
  eventId?: string | null
): Promise<DbAccount | null> {
  const response = await axios.get<RevenueCatCustomer>(
    `${API_BASE}/subscribers/${encodeURIComponent(accountId)}`,
    {
      headers: { Authorization: `Bearer ${requiredApiKey()}` },
      timeout: 8000,
      validateStatus: (status) => status === 200,
    }
  );
  return updateSubscriptionState(accountId, subscriptionState(response.data, eventId));
}
