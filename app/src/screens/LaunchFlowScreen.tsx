import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import type { LaunchSnapshot } from '../services/auth';
import {
  loadLaunchSnapshot,
  loginEmailAccount,
  markIntroSeen,
  markPremium,
  registerEmailAccount,
  signInWithApple,
  signInWithGoogle,
} from '../services/auth';

WebBrowser.maybeCompleteAuthSession();

const INTRO_CARDS = [
  {
    eyebrow: 'LISTEN',
    title: 'Stay sharp when the conversation moves fast.',
    body: 'Wingman tracks the room, spots useful moments, and keeps you in the flow without filling the screen with noise.',
    accent: '#6366f1',
    bullets: ['Live coaching', 'Silent suggestions', 'Low-latency cues'],
  },
  {
    eyebrow: 'COACH',
    title: 'Get the next best move in the moment.',
    body: 'Use the app for sales, hard conversations, networking, and the messy human stuff that benefits from quick guidance.',
    accent: '#8b5cf6',
    bullets: ['Sales mode', 'Conversation strategy', 'Post-call recap'],
  },
  {
    eyebrow: 'UNLOCK',
    title: 'One account. One paywall. Full access.',
    body: 'Create your account, subscribe once, and pick back up on any device without losing your setup.',
    accent: '#ec4899',
    bullets: ['Apple sign in', 'Google sign in', 'Monthly membership'],
  },
];

type LaunchStage = 'loading' | 'intro' | 'account' | 'paywall';
type AccountMode = 'create' | 'signin';

const DEFAULT_PRICE = '$9.99/mo';

type Props = {
  onComplete: () => void;
  skipIntro?: boolean;
};

export function LaunchFlowScreen({ onComplete, skipIntro = false }: Props) {
  const [stage, setStage] = useState<LaunchStage>('loading');
  const [snapshot, setSnapshot] = useState<LaunchSnapshot | null>(null);
  const [introIndex, setIntroIndex] = useState(0);
  const [accountMode, setAccountMode] = useState<AccountMode>('create');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contentAnim = useRef(new Animated.Value(0)).current;

  const googleConfig = useMemo(() => ({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
  }), []);
  const googleConfigured = Boolean(
    googleConfig.androidClientId
    || googleConfig.iosClientId
    || googleConfig.webClientId
    || googleConfig.expoClientId
  );
  useEffect(() => {
    let active = true;
    loadLaunchSnapshot()
      .then((loaded) => {
        if (!active) return;
        setSnapshot(loaded);
        if (!loaded.seenIntro && !skipIntro) {
          setStage('intro');
          return;
        }
        if (!loaded.account) {
          setStage('account');
          return;
        }
        if (!loaded.account.premium) {
          setStage('paywall');
          return;
        }
        onComplete();
      })
      .catch(() => {
        if (!active) return;
        setStage('intro');
      });

    return () => {
      active = false;
    };
  }, [onComplete, skipIntro]);

  useEffect(() => {
    if (stage === 'loading') return;
    contentAnim.setValue(0);
    Animated.timing(contentAnim, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [contentAnim, stage]);

  const handleIntroContinue = async () => {
    setLoadingAction('intro');
    try {
      const next = await markIntroSeen();
      setSnapshot(next);
      setStage(next.account?.premium ? 'paywall' : 'account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not advance.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmailSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }

    setLoadingAction('email');
    setError(null);
    try {
      const next = accountMode === 'create'
        ? await registerEmailAccount({
            displayName: fullName,
            email: trimmedEmail,
            password,
          })
        : await loginEmailAccount({
            email: trimmedEmail,
            password,
          });
      setSnapshot(next);
      setStage('paywall');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Sign In', 'Apple Sign In is only available on iPhone and iPad.');
      return;
    }

    setLoadingAction('apple');
    setError(null);
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        throw new Error('Apple Sign In is not available on this device.');
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const next = await signInWithApple({
        userId: credential.user,
        email: credential.email ?? undefined,
        displayName: [credential.fullName?.givenName, credential.fullName?.familyName]
          .filter(Boolean)
          .join(' '),
      });
      setSnapshot(next);
      setStage('paywall');
    } catch (err) {
      if (err instanceof Error && err.message.includes('ERR_REQUEST_CANCELED')) return;
      setError(err instanceof Error ? err.message : 'Apple sign in failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGoogleToken = async (token: string) => {
    setLoadingAction('google');
    setError(null);
    try {
      const next = await signInWithGoogle({ idToken: token, fallbackEmail: email, fallbackName: fullName });
      setSnapshot(next);
      setStage('paywall');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign in failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStartMembership = async () => {
    setLoadingAction('paywall');
    setError(null);
    try {
      const next = await markPremium();
      setSnapshot(next);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unlock the app.');
    } finally {
      setLoadingAction(null);
    }
  };

  const introProgress = (introIndex + 1) / INTRO_CARDS.length;
  const accountLabel = accountMode === 'create' ? 'Create account' : 'Sign in';
  const accountPrompt = accountMode === 'create'
    ? 'Create your account to save your setup, keep your profile, and unlock the membership step.'
    : 'Sign back in with the same email and password to reconnect your account.';

  if (stage === 'loading') {
    return (
      <View style={s.loadingRoot}>
        <LinearGradient colors={['#090914', '#04040a']} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <LinearGradient colors={['#090914', '#04040a']} style={StyleSheet.absoluteFillObject} />
      <View style={s.topGlow} />
      <View style={s.bottomGlow} />

      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={s.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[s.container, { opacity: contentAnim, transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
            {stage === 'intro' && (
              <IntroStage
                index={introIndex}
                onIndexChange={setIntroIndex}
                onContinue={handleIntroContinue}
                loading={loadingAction === 'intro'}
                progress={introProgress}
              />
            )}

            {stage === 'account' && (
              <AccountStage
                mode={accountMode}
                onModeChange={setAccountMode}
                fullName={fullName}
                setFullName={setFullName}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                onSubmit={handleEmailSubmit}
                onApple={handleAppleSignIn}
                googleEnabled={googleConfigured}
                googleConfig={googleConfig}
                onGoogleToken={handleGoogleToken}
                loading={loadingAction}
                error={error}
                prompt={accountPrompt}
                label={accountLabel}
              />
            )}

            {stage === 'paywall' && (
              <PaywallStage
                price={DEFAULT_PRICE}
                loading={loadingAction === 'paywall'}
                account={snapshot?.account ?? null}
                onPurchase={handleStartMembership}
              />
            )}

            {error && stage !== 'account' && stage !== 'paywall' && (
              <Text style={s.globalError}>{error}</Text>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function IntroStage({
  index,
  onIndexChange,
  onContinue,
  loading,
  progress,
}: {
  index: number;
  onIndexChange: (value: number) => void;
  onContinue: () => void;
  loading: boolean;
  progress: number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const width = Dimensions.get('window').width;

  return (
    <View style={s.stageShell}>
      <View style={s.headerBlock}>
        <Text style={s.kicker}>WELCOME</Text>
        <Text style={s.title}>Wingman helps you stay sharp in real conversations.</Text>
        <Text style={s.subtitle}>A few quick cards, then your account, then membership.</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={s.carousel}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / width);
          onIndexChange(next);
        }}
      >
        {INTRO_CARDS.map((card) => (
          <View key={card.eyebrow} style={[s.introCardWrap, { width }]}>
            <LinearGradient
              colors={[`${card.accent}24`, '#121224', '#090914']}
              style={s.introCard}
            >
              <Text style={[s.cardEyebrow, { color: card.accent }]}>{card.eyebrow}</Text>
              <Text style={s.cardTitle}>{card.title}</Text>
              <Text style={s.cardBody}>{card.body}</Text>
              <View style={s.cardPills}>
                {card.bullets.map((pill) => (
                  <View key={pill} style={s.cardPill}>
                    <Text style={s.cardPillText}>{pill}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>

      <View style={s.progressRow}>
        {INTRO_CARDS.map((card, i) => (
          <View key={card.eyebrow} style={[s.progressDot, i === index && s.progressDotActive]} />
        ))}
      </View>

      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${Math.max(8, progress * 100)}%` }]} />
      </View>

      <Pressable style={s.primaryButton} onPress={onContinue} disabled={loading}>
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={s.primaryButtonGrad}>
          <Text style={s.primaryButtonText}>{loading ? 'Saving…' : 'Continue'}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function AccountStage({
  mode,
  onModeChange,
  fullName,
  setFullName,
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  onApple,
  googleEnabled,
  googleConfig,
  onGoogleToken,
  loading,
  error,
  prompt,
  label,
}: {
  mode: AccountMode;
  onModeChange: (mode: AccountMode) => void;
  fullName: string;
  setFullName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  onSubmit: () => void;
  onApple: () => void;
  googleEnabled: boolean;
  googleConfig: {
    androidClientId?: string;
    iosClientId?: string;
    webClientId?: string;
    expoClientId?: string;
  };
  onGoogleToken: (token: string) => void;
  loading: string | null;
  error: string | null;
  prompt: string;
  label: string;
}) {
  return (
    <View style={s.stageShell}>
      <View style={s.headerBlock}>
        <Text style={s.kicker}>ACCOUNT</Text>
        <Text style={s.title}>{label}</Text>
        <Text style={s.subtitle}>{prompt}</Text>
      </View>

      <View style={s.segmentRow}>
        <Pressable
          style={[s.segment, mode === 'create' && s.segmentActive]}
          onPress={() => onModeChange('create')}
        >
          <Text style={[s.segmentText, mode === 'create' && s.segmentTextActive]}>Create account</Text>
        </Pressable>
        <Pressable
          style={[s.segment, mode === 'signin' && s.segmentActive]}
          onPress={() => onModeChange('signin')}
        >
          <Text style={[s.segmentText, mode === 'signin' && s.segmentTextActive]}>Sign in</Text>
        </Pressable>
      </View>

      <View style={s.formCard}>
        {mode === 'create' && (
          <Field
            label="Full name"
            placeholder="Nick A. Rushing"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        )}
        <Field
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Password"
          placeholder={mode === 'create' ? 'Create a password' : 'Enter your password'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={s.primaryButton} onPress={onSubmit} disabled={loading === 'email'}>
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={s.primaryButtonGrad}>
            <Text style={s.primaryButtonText}>
              {loading === 'email'
                ? 'Working…'
                : mode === 'create'
                  ? 'Create account'
                  : 'Sign in'}
            </Text>
          </LinearGradient>
        </Pressable>

        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or continue with</Text>
          <View style={s.dividerLine} />
        </View>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={14}
            style={s.appleButton}
            onPress={onApple}
          />
        )}

        {googleEnabled ? (
          <GoogleButton
            loading={loading === 'google'}
            onToken={onGoogleToken}
            config={googleConfig}
          />
        ) : (
          <View style={[s.googleButton, s.googleButtonDisabled]}>
            <View style={s.googleLogo}>
              <Text style={s.googleLogoText}>G</Text>
            </View>
            <Text style={s.googleButtonText}>Continue with Google</Text>
          </View>
        )}

        {!googleEnabled && (
          <Text style={s.helperText}>
            Google sign-in is not configured for this build yet.
          </Text>
        )}

        {error && <Text style={s.errorText}>{error}</Text>}
      </View>
    </View>
  );
}

function PaywallStage({
  price,
  loading,
  account,
  onPurchase,
}: {
  price: string;
  loading: boolean;
  account: LaunchSnapshot['account'];
  onPurchase: () => void;
}) {
  const highlights = [
    'Unlimited live coaching sessions',
    'Saved settings across devices',
    'Fast replay, summaries, and follow-up notes',
    'Priority access to new modes',
  ];

  return (
    <View style={s.stageShell}>
      <View style={s.headerBlock}>
        <Text style={s.kicker}>MEMBERSHIP</Text>
        <Text style={s.title}>Unlock Wingman for {price}</Text>
        <Text style={s.subtitle}>
          One account, one membership, and the full app experience.
        </Text>
      </View>

      <View style={s.paywallCard}>
        <View style={s.priceRow}>
          <Text style={s.priceValue}>$9.99</Text>
          <View>
            <Text style={s.priceLabel}>per month</Text>
            <Text style={s.priceMeta}>Cancel anytime</Text>
          </View>
        </View>

        <View style={s.featureList}>
          {highlights.map((item) => (
            <View key={item} style={s.featureRow}>
              <View style={s.featureDot} />
              <Text style={s.featureText}>{item}</Text>
            </View>
          ))}
        </View>

        {account && (
          <View style={s.accountChip}>
            <Text style={s.accountChipLabel}>Signed in as</Text>
            <Text style={s.accountChipValue}>{account.email}</Text>
          </View>
        )}

        <Pressable style={s.primaryButton} onPress={onPurchase} disabled={loading}>
          <LinearGradient colors={['#ec4899', '#8b5cf6']} style={s.primaryButtonGrad}>
            <Text style={s.primaryButtonText}>{loading ? 'Unlocking…' : 'Start membership'}</Text>
          </LinearGradient>
        </Pressable>

        <Text style={s.helperText}>
          Membership unlocks the full app experience.
        </Text>
      </View>
    </View>
  );
}

function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="rgba(148,163,184,0.65)"
        style={[s.field, props.style]}
      />
    </View>
  );
}

function GoogleButton({
  loading,
  onToken,
  config,
}: {
  loading: boolean;
  onToken: (token: string) => void;
  config: {
    androidClientId?: string;
    iosClientId?: string;
    webClientId?: string;
    expoClientId?: string;
  };
}) {
  const [request, response, promptGoogle] = Google.useIdTokenAuthRequest(config as any);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const token =
      response.authentication?.idToken
      ?? (response.params as Record<string, string | undefined> | undefined)?.id_token;
    if (token) onToken(token);
  }, [onToken, response]);

  const handlePress = async () => {
    if (!request || loading) return;
    await promptGoogle();
  };

  return (
    <Pressable
      style={s.googleButton}
      onPress={handlePress}
      disabled={!request || loading}
    >
      <View style={s.googleLogo}>
        <Text style={s.googleLogoText}>G</Text>
      </View>
      <Text style={s.googleButtonText}>
        {loading ? 'Signing in…' : 'Continue with Google'}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#04040a',
  },
  root: {
    flex: 1,
    backgroundColor: '#04040a',
  },
  safe: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 18,
  },
  topGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -80,
    left: -70,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  bottomGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    right: -80,
    bottom: 10,
    backgroundColor: 'rgba(236,72,153,0.06)',
  },
  stageShell: {
    flex: 1,
    gap: 16,
  },
  headerBlock: {
    gap: 8,
    paddingTop: 2,
  },
  kicker: {
    color: '#8b5cf6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  carousel: {
    alignItems: 'stretch',
  },
  introCardWrap: {
    paddingRight: 10,
  },
  introCard: {
    flex: 1,
    minHeight: 340,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 22,
    gap: 14,
    justifyContent: 'center',
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.4,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  cardBody: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  cardPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  cardPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardPillText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(148,163,184,0.28)',
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#8b5cf6',
  },
  progressBar: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#8b5cf6',
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryButtonGrad: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  segmentActive: {
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderColor: 'rgba(139,92,246,0.45)',
  },
  segmentText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#f8fafc',
  },
  formCard: {
    gap: 14,
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  field: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: '#f8fafc',
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.16)',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  appleButton: {
    width: '100%',
    height: 46,
    borderRadius: 14,
  },
  googleButton: {
    minHeight: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  googleLogoText: {
    color: '#4285F4',
    fontWeight: '900',
    fontSize: 14,
  },
  googleButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  helperText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: '#fda4af',
    fontSize: 12,
    lineHeight: 18,
  },
  paywallCard: {
    gap: 16,
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  priceValue: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  priceLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  priceMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  featureList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: '#8b5cf6',
  },
  featureText: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20,
  },
  accountChip: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.24)',
    gap: 4,
  },
  accountChipLabel: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  accountChipValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  globalError: {
    color: '#fda4af',
    fontSize: 12,
    lineHeight: 18,
  },
});
