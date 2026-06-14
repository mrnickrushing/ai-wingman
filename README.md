# AI Wingman

> "The smartest person in every room — and nobody knows it's you."

AI Wingman is a real-time AI coaching app that listens to your conversations through your phone's mic and whispers live suggestions to your AirPods. It's a co-pilot for every high-stakes human conversation — dates, sales calls, pitches, networking events, and the conversations you lose sleep over.

---

## How It Works

The core loop: **Listen → Understand → Coach → Stay invisible.**

1. **Activate a Mode** — Open the app and choose your scenario (Date, Sales, Network, Pitch, etc.)
2. **Mic picks up the room** — Your phone sits in your pocket and listens to the full conversation
3. **AI processes in real time** — Deepgram converts speech to text in <300ms
4. **Coaching whispered to you** — Short, punchy suggestions delivered to your earpiece in <700ms total
5. **You decide** — Wingman never controls you; it's a suggestion engine, not a script

## Launch Flow

The app now uses a gated first-run flow:

1. A short onboarding carousel explains the app
2. The user creates an account or signs in
3. Apple Sign In is available on iOS
4. Google Sign In is available when the OAuth client IDs are configured in the app environment
5. A membership screen shows the monthly price before the user reaches the main app

Google Cloud service-account JSON is not enough for mobile sign-in. The app needs OAuth client IDs for the Google auth flow.

## Purchases

The membership screen uses RevenueCat. It does not locally mark users premium unless the `pro` entitlement is active and the backend accepts the premium update.

Required production variables:

- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` — RevenueCat iOS public SDK key
- `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` — defaults to `pro`
- `EXPO_PUBLIC_REVENUECAT_PACKAGE_ID` — defaults to `$rc_monthly`

If the RevenueCat key is missing, the app shows a clear purchases-not-configured message instead of unlocking the app.

## OTA Updates & `EAS_PROJECT_ID`

The app uses `expo-updates` for over-the-air updates. This requires either an Expo project ID or an explicit updates URL.

- Set `EAS_PROJECT_ID` in the build environment, or set `EXPO_UPDATES_URL` directly.
- The linked Expo project is `@rushingtechnologies/ai-wingman`, project ID `0f5adf3f-ab58-451a-bf61-dddc1b58143b`.
- When a real project ID is set, `app/app.config.js` builds `https://u.expo.dev/<projectId>` and enables OTA updates.
- If the project ID is removed and no `EXPO_UPDATES_URL` is provided, OTA updates are disabled and the app launches normally. This avoids the startup crash caused by a malformed updates URL.
- Codemagic includes an `expo-ota-production` workflow that runs `eas update --branch production --platform ios`.

In short: the app runs fine without `EAS_PROJECT_ID` — you only need it to ship OTA updates.

## Live Audio Ready Check

Each mode setup screen includes a live audio check. It verifies:

- Wingman server health
- Microphone permission
- Native recorder startup
- A short voice sample with detectable input

Run this before a live session when testing a fresh build or a new device.

---

## Modes

### Dating Mode
- Builds a quick profile from their name + Instagram/LinkedIn before the date
- Set your intent: casual, serious, playful, confident
- Real-time: detects awkward silences, reads emotional tone, spots callback opportunities, suggests escalation cues, flags when you're over-talking
- Post-date: full transcript summary, follow-up text suggestions with timing, long-term attraction profile

### Sales & Cold Calls Mode
- Pre-call: paste a LinkedIn URL → instant 60-second dossier; load your objection library; set your goal
- Real-time: detects objections and whispers rebuttals instantly, spots buying signals, monitors talk-to-listen ratio, surfaces relevant case studies mid-call, alerts when prospect disengages
- Post-call: auto-generates CRM notes, tracks objection patterns across your pipeline, scores call performance over time
- **Revenue model:** Sales teams pay $50–100/seat/month without blinking

### Networking Mode
- Pre-event: upload the agenda/attendee list → pre-loaded conversation starters per target contact
- Real-time: detects who you're talking to, surfaces relevant talking points, suggests graceful exits when a conversation is dying, tracks everyone you've spoken to
- Post-event: generates personalized LinkedIn messages for every contact, schedules optimal follow-up timing

### Pitching & Presenting Mode
- Upload your pitch deck → Wingman builds a mental model of your structure and weak points
- Real-time: tracks time vs. planned structure, surfaces answers when Q&A goes off-script, monitors room energy, reminds you of key metrics if you forget
- **Dream use case:** A founder raises their Series A with Wingman in their ear

### Hard Conversations Mode
Salary negotiations, firings, breakups, confrontations — the conversations people lose sleep over.

| Scenario | What Wingman Does |
|---|---|
| Salary Negotiation | Live anchoring tips, counter-offer framing, silence coaching |
| Firing / Layoff | Legal-safe phrasing, empathy cues, de-escalation support |
| Relationship Breakup | Clear, kind language; detects circular arguing |
| Confronting a Friend | Non-accusatory framing, 'I' statements, exit ramp suggestions |
| Landlord / Vendor Disputes | Surfaces relevant leverage and rights |
| Therapy Prep | Session journaling, key topics to surface, emotional vocabulary building |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Speech → Text | Deepgram Nova-3 (<250ms latency) |
| AI Brain | Claude API with persistent conversation memory per session |
| Text → Speech | ElevenLabs Turbo v2 or OpenAI TTS (whisper-tone, low volume) |
| Mobile App | React Native — one codebase, iOS + Android |
| Backend | Node.js + Railway for API orchestration; GCP Cloud Run for inference |
| Auth & Storage | Firebase Auth + Firestore (user profiles, session history, objection libraries) |
| Payments | Stripe Billing — subscriptions + usage-based overages |

**Hard technical problems to solve:**
- Background noise isolation in real environments (restaurants, bars, conferences)
- Latency: stream tokens directly to TTS instead of waiting for full responses
- Context window management — rolling summary of long conversations
- Battery life during extended background audio sessions on mobile

---

## Monetization

| Tier | Price | What's Included |
|---|---|---|
| Personal | $19/mo | All modes, 20 hrs/month, standard voice |
| Pro | $49/mo | Unlimited hours, CRM integrations, custom objection libraries |
| Sales Teams | $79/seat/mo | Team analytics, manager dashboards, onboarding flows |

**Additional revenue streams:**
- One-time "Mission Packs" — curated coaching for specific events (job interview, first date)
- Coaching API — license the real-time coaching layer to dating apps and sales platforms
- Enterprise deals — Wingman for onboarding new sales reps

---

## Go-to-Market

### Phase 1: Ignite (Months 0–3) — Pre-launch
- Build the TikTok demo video first: *"I used AI to coach me through my first date and it worked"*
- Target dating subreddits, Sales Hacker communities, and LinkedIn influencers simultaneously
- Closed beta with 200 salespeople — track win rate change, build the case study
- Land one controversial podcast appearance (My First Million, Diary of a CEO)

### Phase 2: Monetize (Months 3–9) — Growth
- Product Hunt launch on a Tuesday with 50 hunters lined up — target #1 of the week
- B2B push: cold email every sales manager at companies with 10–100 reps
- App Store ASO: own "sales coaching app", "dating coach app", "AI wingman" keywords
- Affiliate program for dating coaches, sales trainers, and life coaches (20% recurring)

### Phase 3: Scale (Months 9–18) — Expansion
- International: Japanese and Korean dating markets are enormous and underserved
- Enterprise sales onboarding product — sell to VP Sales at mid-market companies
- Hardware play: partner with a smart earpiece brand or build "The Wingman" earpiece
- Raise seed round on B2B ARR traction; use capital to hire a sales team that sells to sales teams

---

## Controversy Strategy

The ethical questions are real. Lean in — don't hide.

| Objection | Reframe |
|---|---|
| "It's deceptive" | A dating coach in your ear is just a dating coach. This is the same thing, faster. |
| "It's cheating" | Athletes use coaches during games. Lawyers have associates whispering in their ear. |
| "Privacy nightmare" | Consent mode is baked in. The app never records the other person without disclosure. |
| "What if people misuse it?" | They will. Same with Google. The tool isn't responsible for bad actors. |

**Play:**
- Publish a transparency report on Day 1 — how data is handled, what is and isn't stored
- Write the blog post: *"Is AI Wingman ethical? We asked an ethicist."*
- The controversy is free marketing — every hot take on social sends traffic
- Build an advisory board: a dating coach, a sales ethicist, and a privacy lawyer

---

## Roadmap

### Month 1–2 — MVP: Sales Mode Only
- iOS app with Deepgram + Claude integration
- AirPod audio delivery working end-to-end
- Beta with 20 salespeople; collect qualitative feedback

### Month 3–4 — Launch + Dating Mode
- Public launch on Product Hunt
- Dating mode ships with pre-date profile builder and post-date analysis
- First 1,000 paying users

### Month 5–6 — Networking + Pitching Modes
- Networking mode with event import and contact tracking
- Pitching mode with deck upload and investor Q&A prep
- Android version in beta

### Month 7–12 — Platform + Scale
- Android public release
- Coaching API for third-party integrations
- Enterprise onboarding product
- Seed round raise

---

## North Star Metric

**Did Wingman help you get the outcome you wanted from this conversation?**

Tracked via post-session rating. Everything else — latency, retention, revenue — is downstream of this.

---

## Status

| Area | Status |
|---|---|
| Repo initialized | ✅ Done |
| README & project plan | ✅ Done |
| React Native app scaffold | ✅ Done |
| Node.js WebSocket server | ✅ Done |
| Deepgram STT integration | ✅ Done |
| Claude API coaching integration | ✅ Done |
| ElevenLabs TTS integration | ✅ Done |
| Railway deployment (server live) | ✅ Done — `wingman-server-production-5146.up.railway.app` |
| Sales Mode MVP — pre-call setup, active call, coaching overlay | ✅ Done |
| API keys wired to Railway env vars | ✅ Done — Anthropic, Deepgram, ElevenLabs |
| App UI redesign — animated home, wizard pre-call, immersive active call, post-call summary | ✅ Done |
| Marketing landing page | ✅ Done — `aiwingman.rushingtechnologies.com` |
| Terms of Service + Support pages | ✅ Done — `/terms` and `/support` |
| Admin dashboard — waitlist, users, push notifications | ✅ Done — `admin.wingman.rushingtechnologies.com` |
| D1 database — waitlist, users, support, notification log | ✅ Done — `wingman-db` |
| Dating Mode | Planned — Month 3–4 |
| Networking + Pitching Modes | Planned — Month 5–6 |
| Android support | Planned — Month 7+ |
| Enterprise / API layer | Planned — Month 7+ |
