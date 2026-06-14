import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import type { WingmanAccount } from './auth';

type PurchaseStatus = {
  configured: boolean;
  active: boolean;
  message: string;
};

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'pro';
const PACKAGE_IDENTIFIER = process.env.EXPO_PUBLIC_REVENUECAT_PACKAGE_ID ?? '$rc_monthly';

let configuredForUser: string | null = null;

function getApiKey(): string | undefined {
  if (Platform.OS === 'ios') return IOS_API_KEY;
  if (Platform.OS === 'android') return ANDROID_API_KEY;
  return undefined;
}

function hasEntitlement(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
}

async function configurePurchases(account: WingmanAccount): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      Platform.OS === 'ios'
        ? 'Purchases are not configured for this iOS build. Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY in Codemagic.'
        : 'Purchases are not configured for this build.'
    );
  }

  if (configuredForUser === account.id) return;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
  Purchases.configure({
    apiKey,
    appUserID: account.id,
  } as Parameters<typeof Purchases.configure>[0]);
  configuredForUser = account.id;
  await Purchases.logIn(account.id).catch(() => null);
}

async function getMonthlyPackage(): Promise<PurchasesPackage> {
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  const available = current?.availablePackages ?? [];
  const preferred = available.find((pkg) => pkg.identifier === PACKAGE_IDENTIFIER);
  const monthly = current?.monthly ?? available.find((pkg) => pkg.packageType === 'MONTHLY');
  const fallback = available[0];
  const selected = preferred ?? monthly ?? fallback;
  if (!selected) {
    throw new Error('No monthly membership product is available in RevenueCat.');
  }
  return selected;
}

export async function getPurchaseStatus(account: WingmanAccount | null): Promise<PurchaseStatus> {
  if (!account) {
    return { configured: false, active: false, message: 'Create or sign in to an account first.' };
  }
  try {
    await configurePurchases(account);
    const info = await Purchases.getCustomerInfo();
    return {
      configured: true,
      active: hasEntitlement(info),
      message: hasEntitlement(info) ? 'Membership is active.' : 'Membership is available.',
    };
  } catch (err) {
    return {
      configured: false,
      active: false,
      message: err instanceof Error ? err.message : 'Purchases are not configured for this build.',
    };
  }
}

export async function purchaseMembership(account: WingmanAccount | null): Promise<CustomerInfo> {
  if (!account) throw new Error('Create or sign in to an account first.');
  await configurePurchases(account);
  const pkg = await getMonthlyPackage();
  const result = await Purchases.purchasePackage(pkg);
  if (!hasEntitlement(result.customerInfo)) {
    throw new Error(`Purchase completed, but the "${ENTITLEMENT_ID}" entitlement is not active.`);
  }
  return result.customerInfo;
}

export async function restoreMembership(account: WingmanAccount | null): Promise<CustomerInfo> {
  if (!account) throw new Error('Create or sign in to an account first.');
  await configurePurchases(account);
  const info = await Purchases.restorePurchases();
  if (!hasEntitlement(info)) {
    throw new Error(`No active "${ENTITLEMENT_ID}" membership was found to restore.`);
  }
  return info;
}

export async function manageMembership(account: WingmanAccount | null): Promise<void> {
  if (!account) throw new Error('Create or sign in to an account first.');
  await configurePurchases(account);
  await Purchases.showManageSubscriptions();
}
