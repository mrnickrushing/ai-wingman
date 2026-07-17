# AI Wingman

AI Wingman is a live conversation coach that listens, thinks fast, and whispers the next move through your AirPods.

It is built for the moments that matter: sales calls, dates, networking, pitching, hard conversations, and practice sessions before any of those.

---

## What It Does

Wingman turns a live conversation into:

- real-time coaching
- short AirPod prompts
- session recaps
- transcript memory
- follow-up actions
- practice and roleplay
- searchable history

The app is organized around a simple loop:

**Prepare -> Talk -> Review -> Follow up -> Improve**

---

## What Ships Today

### Launch flow

- intro cards on first launch
- account creation and sign-in
- Apple Sign In
- Google Sign In
- monthly membership screen
- access to the app after account + membership

### Navigation

- bottom dock with page icons
- dedicated pages for:
  - Home
  - Briefs
  - Practice
  - History
  - Playbooks
  - Text Coach

### Live coaching

- live session telemetry
- mic health and server health checks
- AirPod coaching audio
- background audio support
- live transcript streaming
- faster coaching cadence
- session resume and recovery controls

### Practice

- voice roleplay with Claude
- Practice with Claude is a featured section
- sales objection drills
- mode-specific practice flows

### Memory and recap

- conversation memory for names, interests, preferences, promises, objections, and follow-ups
- session timeline
- transcript explorer
- bookmarks and saved moments
- history search
- PDF export
- share actions

### Follow-up automation

- follow-up queue
- reminder scheduling
- action items from recaps
- practice tasks
- pre-call briefs

### Text Coach

- message reply drafting
- suggested responses
- rationale
- next move
- what to avoid

### Platform features

- RevenueCat membership
- OTA updates
- account reset/delete
- diagnostics and support info

---

## Pages

### Home

The control center. Start a live session, jump into briefs, review recent recaps, or open practice.

### Briefs

Your prep surface. Use it before a call, date, pitch, or hard conversation.

### Practice

Voice roleplay and drills. No typing. Talk to Claude and hear the response back.

### History

Session timeline, transcript review, exports, bookmarks, and follow-up items.

### Playbooks

Reusable setup packs for repeat conversations and recurring scenarios.

### Text Coach

Draft better replies for texts and DMs without staring at the screen forever.

---

## Modes

### Sales

- objection handling
- talk/listen balance
- call pacing
- follow-up prompts

### Dating

- memory of interests and personal details
- callback suggestions
- second-date ideas
- follow-up text help

### Networking

- conversation starters
- contact tracking
- follow-up timing

### Pitching

- structure support
- Q&A help
- pacing and clarity

### Hard Conversations

- de-escalation cues
- direct phrasing
- emotional control
- outcome-focused prompts

---

## Audio And Background Behavior

Wingman supports background audio so coaching can keep running while the screen is locked or the app is not foregrounded.

The app is built around:

- microphone capture
- live transcript streaming
- AirPod coaching playback
- audio session recovery

If a device or OS state blocks background audio, the app shows that state instead of pretending everything is fine.

---

## Auth And Identity

Wingman supports:

- email account creation
- email sign-in
- Apple Sign In
- Google Sign In

The app uses a separate Google OAuth brand and client IDs for Wingman so it does not share branding with the other app in the suite.

---

## Google Sign-In Notes

Google Sign-In must be configured with the correct OAuth client IDs for:

- iOS
- Android
- Web
- Expo / dev builds

The app does **not** use a service account JSON file for mobile sign-in.

If Google sign-in shows the wrong app name on iOS, the native build or OAuth brand is stale and needs to be rebuilt or corrected in Google Cloud.

---

## RevenueCat

Membership is handled through RevenueCat.

Required runtime values:

- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`
- `EXPO_PUBLIC_REVENUECAT_PACKAGE_ID`

If the key is missing, the app shows a disabled-purchases state instead of silently breaking.

---

## OTA Updates

Wingman uses Expo Updates for JavaScript-only releases.

The OTA channel is:

- `production`

Use OTA for:

- UI changes
- copy changes
- JS-only logic changes

Use a full rebuild for:

- native module changes
- audio session changes
- auth capability changes
- anything that changes `app.json`, entitlements, or plugins

---

## Build And Deploy

The repo is wired for:

- EAS Build iOS builds (`@rushingtechs/ai-wingman` project)
- TestFlight distribution
- Expo OTA publishing
- Railway backend deployment

The current native app identity is:

- name: `AI Wingman`
- bundle id: `com.rushingtechnologies.aiwingman`
- scheme: `aiwingman`

### iOS builds and TestFlight

`npm run build:ios:production` (in `app/`) builds and auto-submits to TestFlight in one step. It needs two things present on whatever machine runs it:

- `app/credentials.json` — local iOS signing credentials (distribution certificate + provisioning profile). See `.gitignore` — this file and any `.p12`/`.mobileprovision`/`.cer`/`.key` are never committed.
- `ASC_API_KEY_PATH` environment variable pointing at an App Store Connect API key `.p8` file, exported in the shell before running the build (e.g. `export ASC_API_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8`). `app/eas.json`'s `submit.production.ios.ascApiKeyPath` reads this from the invoking shell's environment — it is not pulled from EAS's stored environment variables.

The iOS build number is tracked remotely by EAS (`cli.appVersionSource: "remote"` in `eas.json`), so it stays in sync no matter which machine or checkout runs the build.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Mobile | React Native + Expo |
| Audio | `expo-audio` |
| Auth | Email + Apple + Google |
| Realtime | WebSocket coaching sessions |
| STT | Deepgram live transcription |
| Coaching | Claude |
| TTS | AirPod coaching audio |
| Membership | RevenueCat |
| Backend | Node.js + Railway |
| Updates | Expo OTA |

---

## Why It Exists

Most apps either:

- give you a transcript after the fact, or
- give you generic advice that arrives too late

Wingman is built to be useful **while the conversation is still happening** and then keep working after it ends.

---

## Status

Current product areas that are live:

- onboarding and account creation
- Apple and Google sign-in
- paid membership gate
- live coaching
- practice mode
- history and transcript review
- briefs and playbooks
- text coach
- memory and follow-up automation
- OTA updates

---

## Note

This README reflects the live app shape, not a fantasy roadmap.

If a feature is listed here, it is expected to exist in the repo or the current shipped build.
