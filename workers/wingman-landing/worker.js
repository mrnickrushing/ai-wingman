const PAGES = {
  '/': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Wingman — Your real-time conversation co-pilot</title>
  <meta name="description" content="AI Wingman listens to your conversations and whispers live coaching to your AirPods. Sales calls, dates, pitches, hard conversations — win them all." />
  <meta property="og:title" content="AI Wingman — The smartest person in every room" />
  <meta property="og:description" content="Real-time AI coaching whispered to your earpiece. Deepgram + Claude = <700ms from speech to advice." />
  <meta property="og:url" content="https://aiwingman.rushingtechnologies.com" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎧</text></svg>" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #070710;
      --bg2: #0d0d1a;
      --bg3: #13132a;
      --border: rgba(255,255,255,0.07);
      --indigo: #6366f1;
      --violet: #8b5cf6;
      --cyan: #22d3ee;
      --pink: #ec4899;
      --green: #4ade80;
      --amber: #f59e0b;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --radius: 16px;
    }
    html { scroll-behavior: smooth; }
    section[id] { scroll-margin-top: 80px; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; line-height: 1.6; -webkit-font-smoothing: antialiased; }

    /* NAV */
    nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 5%; height: 68px; background: rgba(7,7,16,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
    .nav-logo { font-size: 1.2rem; font-weight: 700; background: linear-gradient(135deg, var(--indigo), var(--cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .nav-links { display: flex; gap: 2rem; align-items: center; }
    .nav-links a { color: var(--muted); text-decoration: none; font-size: 0.9rem; transition: color .2s; }
    .nav-links a:hover { color: var(--text); }
    .nav-cta { background: linear-gradient(135deg, var(--indigo), var(--violet)); color: #fff !important; padding: .45rem 1.1rem; border-radius: 8px; font-weight: 600; }

    /* HERO */
    .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 120px 5% 80px; position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 80% 50% at 50% 20%, rgba(99,102,241,.15) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,.1) 0%, transparent 50%); pointer-events: none; }
    .hero-badge { display: inline-flex; align-items: center; gap: .5rem; background: rgba(99,102,241,.12); border: 1px solid rgba(99,102,241,.3); border-radius: 100px; padding: .3rem .9rem; font-size: .8rem; color: var(--indigo); margin-bottom: 1.5rem; }
    .hero h1 { font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; max-width: 900px; }
    .grad { background: linear-gradient(135deg, var(--indigo) 0%, var(--cyan) 50%, var(--violet) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 1.2rem; color: var(--muted); max-width: 560px; margin: 1.5rem auto 2.5rem; }
    .hero-btns { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
    .btn-primary { background: linear-gradient(135deg, var(--indigo), var(--violet)); color: #fff; padding: .85rem 2rem; border-radius: 12px; font-size: 1rem; font-weight: 600; text-decoration: none; border: none; cursor: pointer; transition: opacity .2s, transform .15s; }
    .btn-primary:hover { opacity: .9; transform: translateY(-1px); }
    .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text); padding: .85rem 2rem; border-radius: 12px; font-size: 1rem; font-weight: 500; text-decoration: none; transition: border-color .2s, background .2s; }
    .btn-ghost:hover { border-color: rgba(255,255,255,.2); background: rgba(255,255,255,.04); }
    .hero-stats { display: flex; gap: 3rem; margin-top: 5rem; flex-wrap: wrap; justify-content: center; }
    .stat { text-align: center; }
    .stat-num { font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, var(--indigo), var(--cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .stat-label { font-size: .8rem; color: var(--muted); margin-top: .2rem; }

    /* SECTIONS */
    section { padding: 100px 5%; }
    .section-label { font-size: .75rem; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--indigo); margin-bottom: 1rem; }
    h2 { font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
    .section-sub { color: var(--muted); font-size: 1.1rem; max-width: 560px; margin-top: 1rem; }
    .center { text-align: center; }
    .center .section-sub { margin: 1rem auto 0; }

    /* HOW IT WORKS */
    .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-top: 4rem; }
    .step { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 2rem; }
    .step-num { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), var(--violet)); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem; margin-bottom: 1.2rem; }
    .step h3 { font-size: 1.05rem; font-weight: 700; margin-bottom: .5rem; }
    .step p { font-size: .9rem; color: var(--muted); }

    /* MODES */
    .modes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 4rem; }
    .mode-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 2rem; transition: border-color .2s, transform .2s; }
    .mode-card:hover { border-color: rgba(99,102,241,.4); transform: translateY(-2px); }
    .mode-icon { font-size: 2rem; margin-bottom: 1rem; }
    .mode-card h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: .5rem; }
    .mode-card p { font-size: .9rem; color: var(--muted); margin-bottom: 1rem; }
    .mode-tag { display: inline-block; background: rgba(99,102,241,.12); border: 1px solid rgba(99,102,241,.25); color: var(--indigo); border-radius: 6px; font-size: .75rem; font-weight: 600; padding: .2rem .6rem; }
    .mode-tag.soon { background: rgba(148,163,184,.08); border-color: rgba(148,163,184,.15); color: var(--muted); }

    /* PIPELINE */
    .pipeline { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 2.5rem; margin-top: 4rem; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; justify-content: center; }
    .pipe-node { text-align: center; }
    .pipe-badge { background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; padding: .8rem 1.2rem; font-weight: 700; font-size: .9rem; white-space: nowrap; }
    .pipe-detail { font-size: .75rem; color: var(--muted); margin-top: .4rem; }
    .pipe-arrow { color: var(--indigo); font-size: 1.4rem; font-weight: 700; }

    /* PRICING */
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-top: 4rem; max-width: 1000px; margin-left: auto; margin-right: auto; }
    .price-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 2rem; }
    .price-card.featured { border-color: var(--indigo); background: linear-gradient(135deg, rgba(99,102,241,.08), rgba(139,92,246,.05)); }
    .price-name { font-size: .85rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
    .price-amount { font-size: 2.8rem; font-weight: 800; margin: .5rem 0; }
    .price-amount span { font-size: 1rem; font-weight: 400; color: var(--muted); }
    .price-desc { color: var(--muted); font-size: .9rem; margin-bottom: 1.5rem; }
    .price-features { list-style: none; display: flex; flex-direction: column; gap: .6rem; }
    .price-features li { font-size: .9rem; display: flex; gap: .5rem; align-items: flex-start; }
    .price-features li::before { content: '✓'; color: var(--green); font-weight: 700; flex-shrink: 0; }
    .price-btn { display: block; margin-top: 2rem; text-align: center; text-decoration: none; padding: .75rem; border-radius: 10px; font-weight: 600; font-size: .95rem; transition: opacity .2s; }
    .price-btn-primary { background: linear-gradient(135deg, var(--indigo), var(--violet)); color: #fff; }
    .price-btn-ghost { border: 1px solid var(--border); color: var(--text); }
    .price-btn:hover { opacity: .85; }

    /* WAITLIST */
    #waitlist { background: var(--bg2); }
    .waitlist-inner { max-width: 560px; margin: 0 auto; text-align: center; }
    .waitlist-inner p { color: var(--muted); margin: 1rem 0 2rem; }
    .waitlist-form { display: flex; flex-direction: column; gap: .8rem; }
    .form-row { display: flex; gap: .8rem; }
    .form-input { flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; padding: .75rem 1rem; color: var(--text); font-size: .95rem; outline: none; transition: border-color .2s; }
    .form-input:focus { border-color: var(--indigo); }
    .form-input::placeholder { color: var(--muted); }
    .form-select { flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; padding: .75rem 1rem; color: var(--text); font-size: .95rem; outline: none; cursor: pointer; }
    .form-select option { background: var(--bg3); }
    #waitlist-msg { min-height: 1.5rem; font-size: .9rem; color: var(--green); }

    /* FOOTER */
    footer { border-top: 1px solid var(--border); padding: 3rem 5%; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .footer-logo { font-weight: 700; background: linear-gradient(135deg, var(--indigo), var(--cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .footer-links { display: flex; gap: 1.5rem; }
    .footer-links a { color: var(--muted); text-decoration: none; font-size: .85rem; transition: color .2s; }
    .footer-links a:hover { color: var(--text); }
    .footer-copy { color: var(--muted); font-size: .8rem; width: 100%; }

    @media (max-width: 640px) {
      .nav-links { display: none; }
      .form-row { flex-direction: column; }
      .pipeline { flex-direction: column; }
      .pipe-arrow { transform: rotate(90deg); }
      footer { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>

<nav>
  <span class="nav-logo">🎧 AI Wingman</span>
  <div class="nav-links">
    <a href="#how-it-works">How it works</a>
    <a href="#modes">Modes</a>
    <a href="#pricing">Pricing</a>
    <a href="/support">Support</a>
    <a href="#waitlist" class="nav-cta">Join waitlist</a>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hero-badge">🚀 Now in private beta</div>
  <h1>The <span class="grad">smartest person</span><br>in every room.</h1>
  <p>AI Wingman listens to your conversations and whispers live coaching to your earpiece in under 700ms. Sales calls, dates, pitches — win them all.</p>
  <div class="hero-btns">
    <a href="#waitlist" class="btn-primary">Join the waitlist →</a>
    <a href="#how-it-works" class="btn-ghost">See how it works</a>
  </div>
  <div class="hero-stats">
    <div class="stat"><div class="stat-num">&lt;700ms</div><div class="stat-label">Speech to coaching</div></div>
    <div class="stat"><div class="stat-num">5 modes</div><div class="stat-label">Sales, Dating, Networking &amp; more</div></div>
    <div class="stat"><div class="stat-num">100%</div><div class="stat-label">Private — you control your data</div></div>
  </div>
</section>

<!-- HOW IT WORKS -->
<section id="how-it-works">
  <div class="section-label">How it works</div>
  <h2>Listen. Understand. Coach.<br>Stay invisible.</h2>
  <p class="section-sub">A four-step loop that runs entirely in your pocket, invisible to everyone but you.</p>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><h3>Activate a mode</h3><p>Pick your scenario — sales call, first date, pitch meeting — and set context in 30 seconds.</p></div>
    <div class="step"><div class="step-num">2</div><h3>Mic listens</h3><p>Your phone captures the conversation at 16kHz. It stays in your pocket. Nobody knows.</p></div>
    <div class="step"><div class="step-num">3</div><h3>AI coaches</h3><p>Deepgram transcribes in &lt;250ms. Claude analyzes and generates a punchy suggestion in &lt;450ms more.</p></div>
    <div class="step"><div class="step-num">4</div><h3>Whispered to you</h3><p>ElevenLabs delivers the coaching to your AirPods. 15 words max. You decide what to do with it.</p></div>
  </div>

  <div class="pipeline">
    <div class="pipe-node"><div class="pipe-badge">🎙️ Mic</div><div class="pipe-detail">16kHz PCM</div></div>
    <div class="pipe-arrow">→</div>
    <div class="pipe-node"><div class="pipe-badge">Deepgram Nova-3</div><div class="pipe-detail">&lt;250ms STT</div></div>
    <div class="pipe-arrow">→</div>
    <div class="pipe-node"><div class="pipe-badge">Claude Sonnet</div><div class="pipe-detail">&lt;450ms coaching</div></div>
    <div class="pipe-arrow">→</div>
    <div class="pipe-node"><div class="pipe-badge">ElevenLabs</div><div class="pipe-detail">TTS to AirPods</div></div>
    <div class="pipe-arrow">→</div>
    <div class="pipe-node"><div class="pipe-badge">🎧 You win</div><div class="pipe-detail">Total &lt;700ms</div></div>
  </div>
</section>

<!-- MODES -->
<section id="modes" style="background: var(--bg2);">
  <div class="center">
    <div class="section-label">Conversation modes</div>
    <h2>A co-pilot for every<br>high-stakes conversation</h2>
    <p class="section-sub">Each mode has a purpose-built coaching model tuned for the stakes involved.</p>
  </div>
  <div class="modes-grid">
    <div class="mode-card">
      <div class="mode-icon">💼</div>
      <h3>Sales &amp; Cold Calls</h3>
      <p>Detects objections and whispers instant rebuttals. Spots buying signals. Tracks your speaking pace.</p>
      <span class="mode-tag">Live now</span>
    </div>
    <div class="mode-card">
      <div class="mode-icon">💘</div>
      <h3>Dating</h3>
      <p>Builds a quick profile before the date. Detects awkward silences, reads emotional tone, spots callback opportunities.</p>
      <span class="mode-tag soon">Coming soon</span>
    </div>
    <div class="mode-card">
      <div class="mode-icon">🤝</div>
      <h3>Networking</h3>
      <p>Pre-loads talking points per contact. Suggests graceful exits. Generates personalized follow-ups post-event.</p>
      <span class="mode-tag soon">Coming soon</span>
    </div>
    <div class="mode-card">
      <div class="mode-icon">🚀</div>
      <h3>Pitching</h3>
      <p>Upload your deck. Wingman tracks your structure, surfaces answers during Q&amp;A, monitors room energy.</p>
      <span class="mode-tag soon">Coming soon</span>
    </div>
    <div class="mode-card">
      <div class="mode-icon">🔥</div>
      <h3>Hard Conversations</h3>
      <p>Salary negotiations, firings, breakups. Legal-safe phrasing, empathy cues, de-escalation — whatever the room needs.</p>
      <span class="mode-tag soon">Coming soon</span>
    </div>
  </div>
</section>

<!-- PRICING -->
<section id="pricing">
  <div class="center">
    <div class="section-label">Pricing</div>
    <h2>Pay for outcomes,<br>not tokens</h2>
    <p class="section-sub">Simple plans. Cancel anytime.</p>
  </div>
  <div class="pricing-grid">
    <div class="price-card">
      <div class="price-name">Personal</div>
      <div class="price-amount">$19<span>/mo</span></div>
      <div class="price-desc">For individuals leveling up their conversations.</div>
      <ul class="price-features">
        <li>All modes</li>
        <li>20 hours / month</li>
        <li>Standard voice</li>
        <li>Session transcripts</li>
      </ul>
      <a href="#waitlist" class="price-btn price-btn-ghost">Join waitlist</a>
    </div>
    <div class="price-card featured">
      <div class="price-name">Pro</div>
      <div class="price-amount">$49<span>/mo</span></div>
      <div class="price-desc">For professionals who close deals for a living.</div>
      <ul class="price-features">
        <li>Everything in Personal</li>
        <li>Unlimited hours</li>
        <li>CRM integrations</li>
        <li>Custom objection libraries</li>
        <li>Post-call AI summaries</li>
      </ul>
      <a href="#waitlist" class="price-btn price-btn-primary">Join waitlist</a>
    </div>
    <div class="price-card">
      <div class="price-name">Sales Teams</div>
      <div class="price-amount">$79<span>/seat</span></div>
      <div class="price-desc">For teams that need coaching at scale.</div>
      <ul class="price-features">
        <li>Everything in Pro</li>
        <li>Team analytics dashboard</li>
        <li>Manager coaching insights</li>
        <li>Onboarding flows</li>
        <li>Priority support</li>
      </ul>
      <a href="mailto:support@rushingtechnologies.com" class="price-btn price-btn-ghost">Contact sales</a>
    </div>
  </div>
</section>

<!-- WAITLIST -->
<section id="waitlist">
  <div class="waitlist-inner">
    <div class="section-label">Early access</div>
    <h2>Get in before<br>everyone else does.</h2>
    <p>Beta testers get 3 months free, a founder shoutout, and direct input on what we build next.</p>
    <form class="waitlist-form" onsubmit="submitWaitlist(event)">
      <div class="form-row">
        <input class="form-input" type="text" id="wl-name" placeholder="Your name" required />
        <input class="form-input" type="email" id="wl-email" placeholder="your@email.com" required />
      </div>
      <select class="form-select" id="wl-mode">
        <option value="">What are you most excited about?</option>
        <option value="sales">Sales &amp; Cold Calls</option>
        <option value="dating">Dating</option>
        <option value="networking">Networking</option>
        <option value="pitching">Pitching</option>
        <option value="hard">Hard Conversations</option>
      </select>
      <button type="submit" class="btn-primary" style="width:100%;border:none;font-size:1rem;padding:.9rem;">Reserve my spot →</button>
      <div id="waitlist-msg"></div>
    </form>
  </div>
</section>

<footer>
  <span class="footer-logo">🎧 AI Wingman</span>
  <div class="footer-links">
    <a href="/terms">Terms</a>
    <a href="/support">Support</a>
    <a href="mailto:support@rushingtechnologies.com">Contact</a>
  </div>
  <div class="footer-copy">© 2026 AI Wingman. All rights reserved. Built by <a href="https://rushingtechnologies.com" style="color:var(--indigo);text-decoration:none;">Rushing Technologies</a>.</div>
</footer>

<script>
async function submitWaitlist(e) {
  e.preventDefault();
  const msg = document.getElementById('waitlist-msg');
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  try {
    const res = await fetch('/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('wl-name').value.trim(),
        email: document.getElementById('wl-email').value.trim(),
        mode: document.getElementById('wl-mode').value,
      })
    });
    const data = await res.json();
    if (res.ok) {
      msg.style.color = 'var(--green)';
      msg.textContent = "🎉 You're on the list! We'll be in touch soon.";
      e.target.reset();
    } else {
      msg.style.color = 'var(--pink)';
      msg.textContent = data.error || 'Something went wrong. Try again.';
    }
  } catch {
    msg.style.color = 'var(--pink)';
    msg.textContent = 'Network error. Please try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Reserve my spot →';
  }
}
</script>
</body>
</html>`,

  '/terms': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Terms of Service — AI Wingman</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎧</text></svg>" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#070710;--bg2:#0d0d1a;--border:rgba(255,255,255,.07);--indigo:#6366f1;--text:#f1f5f9;--muted:#94a3b8}
    body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;line-height:1.7;-webkit-font-smoothing:antialiased}
    nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 5%;height:68px;background:rgba(7,7,16,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
    .nav-logo{font-size:1.1rem;font-weight:700;background:linear-gradient(135deg,var(--indigo),#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-decoration:none}
    .nav-back{color:var(--muted);text-decoration:none;font-size:.9rem}
    .nav-back:hover{color:var(--text)}
    main{max-width:760px;margin:0 auto;padding:120px 5% 80px}
    h1{font-size:2.5rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:.5rem}
    .meta{color:var(--muted);font-size:.9rem;margin-bottom:3rem;padding-bottom:2rem;border-bottom:1px solid var(--border)}
    h2{font-size:1.3rem;font-weight:700;margin:2.5rem 0 .75rem;color:var(--text)}
    p{color:var(--muted);margin-bottom:1rem}
    ul{color:var(--muted);margin:.5rem 0 1rem 1.5rem;display:flex;flex-direction:column;gap:.4rem}
    a{color:var(--indigo)}
    footer{text-align:center;padding:3rem 5%;color:var(--muted);font-size:.8rem;border-top:1px solid var(--border)}
  </style>
</head>
<body>
<nav>
  <a href="/" class="nav-logo">🎧 AI Wingman</a>
  <a href="/" class="nav-back">← Back to home</a>
</nav>
<main>
  <h1>Terms of Service</h1>
  <div class="meta">Last updated: June 14, 2026 &nbsp;·&nbsp; Effective: June 14, 2026</div>

  <h2>1. Acceptance of Terms</h2>
  <p>By downloading, installing, or using AI Wingman ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the App.</p>

  <h2>2. Description of Service</h2>
  <p>AI Wingman is a real-time conversation coaching application that uses microphone input, AI speech-to-text, and AI language models to provide live coaching suggestions delivered via audio to your earpiece. The App is intended for personal productivity and professional development purposes.</p>

  <h2>3. Consent and Recording Notice</h2>
  <p><strong>You are solely responsible for obtaining all necessary consents before using AI Wingman in any conversation.</strong> Recording laws vary by jurisdiction. In many places, all parties to a conversation must consent to being recorded. By using the App, you represent that:</p>
  <ul>
    <li>You have obtained all legally required consents from all conversation participants</li>
    <li>You understand and comply with applicable wiretapping, eavesdropping, and recording laws in your jurisdiction</li>
    <li>You will not use the App for any unlawful surveillance or interception</li>
  </ul>
  <p>AI Wingman accepts no liability for your failure to comply with applicable recording and consent laws.</p>

  <h2>4. Permitted Use</h2>
  <p>You may use AI Wingman for lawful personal and professional purposes. You may not:</p>
  <ul>
    <li>Use the App to facilitate fraud, deception, harassment, or any illegal activity</li>
    <li>Reverse engineer, decompile, or attempt to extract source code</li>
    <li>Resell or sublicense access to the Service</li>
    <li>Use the App to train competing AI models</li>
    <li>Circumvent usage limits or access controls</li>
  </ul>

  <h2>5. Privacy and Data</h2>
  <p>Audio captured by the App is processed in real time and transmitted to our servers for transcription and coaching. We do not retain raw audio beyond the active session. Session transcripts may be stored for up to 90 days to provide post-session summaries and improve our service. Please review our <a href="/privacy">Privacy Policy</a> for full details.</p>

  <h2>6. Subscriptions, Auto-Renewal, and Billing</h2>
  <p>AI Wingman offers <strong>Wingman Pro</strong>, an auto-renewable subscription sold through the Apple App Store:</p>
  <ul>
    <li><strong>Subscription:</strong> Wingman Pro — full access to all coaching modes and features.</li>
    <li><strong>Price &amp; length:</strong> $9.99 (USD) per month. Prices may vary by region and are shown in the App before you confirm any purchase.</li>
    <li><strong>Auto-renewal:</strong> Payment is charged to your Apple ID account upon confirmation of purchase. The subscription <strong>automatically renews each month</strong> unless auto-renew is turned off at least 24 hours before the end of the current period.</li>
    <li><strong>Renewal charge:</strong> Your account is charged for renewal within 24 hours prior to the end of the current period, at the price stated above.</li>
    <li><strong>Managing your subscription:</strong> You can manage or cancel your subscription at any time in your device's <strong>Settings → [your name] → Subscriptions</strong>, or in the App Store. Deleting the App does not cancel your subscription.</li>
    <li><strong>Free trial:</strong> If a free trial is offered, any unused portion is forfeited when you purchase a subscription.</li>
  </ul>
  <p>Purchases are processed by Apple and are subject to Apple's <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">Terms of Use (EULA)</a> and our <a href="/privacy">Privacy Policy</a>. Refunds for App Store purchases are handled by Apple in accordance with its policies. For billing questions, contact <a href="mailto:support@rushingtechnologies.com">support@rushingtechnologies.com</a>.</p>

  <h2>7. AI Disclaimer</h2>
  <p>AI Wingman uses artificial intelligence — including automated speech recognition and large language models — to generate coaching suggestions in real time. <strong>AI-generated output may be inaccurate, incomplete, biased, or inappropriate for your specific situation.</strong> All suggestions are provided for informational purposes only and do not constitute professional legal, financial, medical, psychological, or other professional advice. You are solely responsible for reviewing any suggestion and for any decision or action you take. Do not rely on AI Wingman in situations where an error could result in harm.</p>

  <h2>8. Limitation of Liability</h2>
  <p>To the maximum extent permitted by law, AI Wingman and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App, including but not limited to lost revenue, lost profits, or relationship harm.</p>

  <h2>9. Termination</h2>
  <p>We may terminate or suspend your account at our discretion for violations of these Terms. You may cancel your account at any time through the App or by emailing support.</p>

  <h2>10. Changes to Terms</h2>
  <p>We may update these Terms from time to time. Continued use of the App after changes constitutes acceptance of the updated Terms. Material changes will be notified via email or in-app notice.</p>

  <h2>11. Contact</h2>
  <p>Questions about these Terms? Email us at <a href="mailto:support@rushingtechnologies.com">support@rushingtechnologies.com</a>.</p>
  <p>AI Wingman is operated by Rushing Technologies.</p>
</main>
<footer>© 2026 AI Wingman by Rushing Technologies · <a href="/">Home</a> · <a href="/support">Support</a> · <a href="/privacy">Privacy</a></footer>
</body>
</html>`,

  '/support': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Support — AI Wingman</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎧</text></svg>" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#070710;--bg2:#0d0d1a;--bg3:#13132a;--border:rgba(255,255,255,.07);--indigo:#6366f1;--violet:#8b5cf6;--green:#4ade80;--pink:#ec4899;--text:#f1f5f9;--muted:#94a3b8;--radius:16px}
    body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;line-height:1.7;-webkit-font-smoothing:antialiased}
    nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 5%;height:68px;background:rgba(7,7,16,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
    .nav-logo{font-size:1.1rem;font-weight:700;background:linear-gradient(135deg,var(--indigo),#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-decoration:none}
    .nav-back{color:var(--muted);text-decoration:none;font-size:.9rem}
    .nav-back:hover{color:var(--text)}
    main{max-width:800px;margin:0 auto;padding:120px 5% 80px}
    .hero{text-align:center;margin-bottom:4rem}
    h1{font-size:2.5rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:1rem}
    .sub{color:var(--muted);font-size:1.1rem}
    .contact-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-bottom:4rem}
    .contact-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;text-align:center}
    .contact-icon{font-size:2rem;margin-bottom:.75rem}
    .contact-card h3{font-size:1rem;font-weight:700;margin-bottom:.4rem}
    .contact-card p{font-size:.85rem;color:var(--muted);margin-bottom:1rem}
    .contact-card a{color:var(--indigo);font-size:.9rem;font-weight:600;text-decoration:none}
    h2{font-size:1.5rem;font-weight:700;margin-bottom:1.5rem}
    .faq{display:flex;flex-direction:column;gap:.75rem;margin-bottom:4rem}
    .faq-item{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
    .faq-q{padding:1.2rem 1.5rem;cursor:pointer;font-weight:600;font-size:.95rem;display:flex;justify-content:space-between;align-items:center;user-select:none}
    .faq-q:hover{background:var(--bg3)}
    .faq-chevron{color:var(--muted);transition:transform .2s;font-size:.8rem}
    .faq-a{display:none;padding:0 1.5rem 1.2rem;color:var(--muted);font-size:.9rem}
    .faq-item.open .faq-a{display:block}
    .faq-item.open .faq-chevron{transform:rotate(180deg)}
    .form-section{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:2.5rem}
    .form-section h2{margin-bottom:.5rem}
    .form-section p{color:var(--muted);margin-bottom:2rem;font-size:.9rem}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
    .form-full{grid-column:1/-1}
    input,select,textarea{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:.75rem 1rem;color:var(--text);font-size:.9rem;font-family:inherit;outline:none;transition:border-color .2s;resize:vertical}
    input:focus,select:focus,textarea:focus{border-color:var(--indigo)}
    input::placeholder,textarea::placeholder{color:var(--muted)}
    .submit-btn{margin-top:.5rem;background:linear-gradient(135deg,var(--indigo),var(--violet));color:#fff;border:none;border-radius:10px;padding:.85rem 2rem;font-size:.95rem;font-weight:600;cursor:pointer;transition:opacity .2s}
    .submit-btn:hover{opacity:.9}
    .submit-btn:disabled{opacity:.5;cursor:not-allowed}
    #support-msg{margin-top:.75rem;font-size:.9rem;min-height:1.2rem;color:var(--green)}
    footer{text-align:center;padding:3rem 5%;color:var(--muted);font-size:.8rem;border-top:1px solid var(--border)}
    @media(max-width:640px){.form-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
<nav>
  <a href="/" class="nav-logo">🎧 AI Wingman</a>
  <a href="/" class="nav-back">← Back to home</a>
</nav>
<main>
  <div class="hero">
    <h1>How can we help?</h1>
    <p class="sub">We're a small team and we actually respond. Usually within a few hours.</p>
  </div>

  <div class="contact-cards">
    <div class="contact-card">
      <div class="contact-icon">💬</div>
      <h3>General support</h3>
      <p>Questions, bugs, feedback</p>
      <a href="mailto:support@rushingtechnologies.com">support@rushingtechnologies.com</a>
    </div>
    <div class="contact-card">
      <div class="contact-icon">💳</div>
      <h3>Billing</h3>
      <p>Refunds, plan changes</p>
      <a href="mailto:support@rushingtechnologies.com">support@rushingtechnologies.com</a>
    </div>
    <div class="contact-card">
      <div class="contact-icon">🏢</div>
      <h3>Enterprise sales</h3>
      <p>Team plans, custom deals</p>
      <a href="mailto:support@rushingtechnologies.com">support@rushingtechnologies.com</a>
    </div>
  </div>

  <h2>Frequently asked questions</h2>
  <div class="faq">
    <div class="faq-item">
      <div class="faq-q" onclick="toggle(this)">Does the other person know I'm using Wingman? <span class="faq-chevron">▼</span></div>
      <div class="faq-a">No. The coaching is delivered only to your earpiece. The other person cannot hear it. You are responsible for ensuring any recording complies with applicable laws in your jurisdiction — see our Terms of Service for details.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggle(this)">What earphones work with Wingman? <span class="faq-chevron">▼</span></div>
      <div class="faq-a">Any Bluetooth earphones work. AirPods (any generation), AirPods Pro, and AirPods Max give the best experience because of their audio transparency mode. Wired earphones also work.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggle(this)">Is my conversation data stored? <span class="faq-chevron">▼</span></div>
      <div class="faq-a">Raw audio is never stored beyond the active session. Transcripts are optionally saved for 90 days so you can review your sessions. You can delete your data at any time from the app settings.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggle(this)">What's the latency? <span class="faq-chevron">▼</span></div>
      <div class="faq-a">End-to-end latency from spoken word to coaching in your ear is typically under 700ms on a good connection. Speech-to-text via Deepgram takes ~250ms, Claude coaching ~300–400ms, and TTS ~100ms.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggle(this)">Does it work without internet? <span class="faq-chevron">▼</span></div>
      <div class="faq-a">No. AI Wingman requires an internet connection to function. The AI processing happens on our servers. We recommend a stable Wi-Fi or 5G connection for best results.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggle(this)">How do I cancel my subscription? <span class="faq-chevron">▼</span></div>
      <div class="faq-a">Wingman Pro is an auto-renewing subscription billed through your Apple ID. To cancel, open your device <strong>Settings → [your name] → Subscriptions → AI Wingman → Cancel Subscription</strong> (or manage it in the App Store). Cancel at least 24 hours before your renewal date to avoid the next charge. Deleting the app does not cancel the subscription. Need help? Email <a href="mailto:support@rushingtechnologies.com" style="color:#6366f1">support@rushingtechnologies.com</a>.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggle(this)">Is there an Android version? <span class="faq-chevron">▼</span></div>
      <div class="faq-a">Android is on our roadmap for later this year. Right now we're iOS-only. Join the waitlist to be notified when Android launches.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggle(this)">Is the coaching professional advice? <span class="faq-chevron">▼</span></div>
      <div class="faq-a">No. AI Wingman uses artificial intelligence to generate suggestions in real time, and that output can be inaccurate or inappropriate for your situation. Coaching is for informational purposes only and is not legal, financial, medical, or psychological advice. You're always responsible for what you say and do — see our <a href="/terms" style="color:#6366f1">Terms</a> for the full AI disclaimer.</div>
    </div>
  </div>

  <div class="form-section">
    <h2>Send us a message</h2>
    <p>Can't find what you need? Fill this out and we'll get back to you within 24 hours.</p>
    <form onsubmit="submitSupport(event)">
      <div class="form-grid">
        <input type="text" placeholder="Your name" id="s-name" required />
        <input type="email" placeholder="your@email.com" id="s-email" required />
        <select id="s-topic" class="form-full">
          <option value="">Topic</option>
          <option value="bug">Bug report</option>
          <option value="billing">Billing question</option>
          <option value="feature">Feature request</option>
          <option value="account">Account issue</option>
          <option value="other">Other</option>
        </select>
        <textarea class="form-full" id="s-message" rows="5" placeholder="Describe your issue or question..." required></textarea>
      </div>
      <button class="submit-btn" type="submit">Send message</button>
      <div id="support-msg"></div>
    </form>
  </div>
</main>
<footer>© 2026 AI Wingman by Rushing Technologies · <a href="/" style="color:#6366f1">Home</a> · <a href="/terms" style="color:#6366f1">Terms</a> · <a href="/privacy" style="color:#6366f1">Privacy</a><br/><span style="font-size:.75rem">Coaching is AI-generated and may be inaccurate — for informational purposes only, not professional advice.</span></footer>
<script>
function toggle(el) {
  el.closest('.faq-item').classList.toggle('open');
}
async function submitSupport(e) {
  e.preventDefault();
  const msg = document.getElementById('support-msg');
  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.textContent = 'Sending...';
  try {
    const res = await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('s-name').value.trim(),
        email: document.getElementById('s-email').value.trim(),
        topic: document.getElementById('s-topic').value,
        message: document.getElementById('s-message').value.trim(),
      })
    });
    const data = await res.json();
    if (res.ok) {
      msg.style.color = '#4ade80';
      msg.textContent = "✓ Message sent! We'll reply within 24 hours.";
      e.target.reset();
    } else {
      msg.style.color = '#ec4899';
      msg.textContent = data.error || 'Something went wrong. Try again.';
    }
  } catch {
    msg.style.color = '#ec4899';
    msg.textContent = 'Network error. Please try again.';
  } finally {
    btn.disabled = false; btn.textContent = 'Send message';
  }
}
</script>
</body>
</html>`,

  '/privacy': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — AI Wingman</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎧</text></svg>" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#070710;--bg2:#0d0d1a;--border:rgba(255,255,255,.07);--indigo:#6366f1;--text:#f1f5f9;--muted:#94a3b8}
    body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;line-height:1.7;-webkit-font-smoothing:antialiased}
    nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 5%;height:68px;background:rgba(7,7,16,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
    .nav-logo{font-size:1.1rem;font-weight:700;background:linear-gradient(135deg,var(--indigo),#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-decoration:none}
    .nav-back{color:var(--muted);text-decoration:none;font-size:.9rem}
    .nav-back:hover{color:var(--text)}
    main{max-width:760px;margin:0 auto;padding:120px 5% 80px}
    h1{font-size:2.5rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:.5rem}
    .meta{color:var(--muted);font-size:.9rem;margin-bottom:3rem;padding-bottom:2rem;border-bottom:1px solid var(--border)}
    h2{font-size:1.3rem;font-weight:700;margin:2.5rem 0 .75rem;color:var(--text)}
    p{color:var(--muted);margin-bottom:1rem}
    ul{color:var(--muted);margin:.5rem 0 1rem 1.5rem;display:flex;flex-direction:column;gap:.4rem}
    a{color:var(--indigo)}
    footer{text-align:center;padding:3rem 5%;color:var(--muted);font-size:.8rem;border-top:1px solid var(--border)}
  </style>
</head>
<body>
<nav>
  <a href="/" class="nav-logo">🎧 AI Wingman</a>
  <a href="/" class="nav-back">← Back to home</a>
</nav>
<main>
  <h1>Privacy Policy</h1>
  <div class="meta">Last updated: June 14, 2026 &nbsp;·&nbsp; Effective: June 14, 2026</div>

  <p>AI Wingman ("we", "us"), operated by Rushing Technologies, respects your privacy. This policy explains what we collect, how we use it, and the choices you have. By using the App, you agree to this Privacy Policy.</p>

  <h2>1. Information We Collect</h2>
  <ul>
    <li><strong>Account information:</strong> your name, email address, and an authentication identifier when you create an account or sign in with Apple or Google.</li>
    <li><strong>Audio &amp; conversation content:</strong> audio captured by your microphone during an active coaching session is streamed to our servers and transcribed in real time. <strong>We do not retain raw audio after the session ends.</strong> Session transcripts and the coaching we generate may be stored for up to 90 days so you can review past sessions.</li>
    <li><strong>Usage data:</strong> session length, mode used, number of coaching tips, and your post-session ratings.</li>
    <li><strong>Device &amp; push tokens:</strong> if you enable notifications, we store a push token to deliver them.</li>
    <li><strong>Payment data:</strong> subscriptions are processed by Apple. We never receive or store your full payment-card details; we receive subscription status from Apple and RevenueCat.</li>
  </ul>

  <h2>2. How We Use Your Information</h2>
  <ul>
    <li>To provide real-time coaching and post-session summaries.</li>
    <li>To operate, secure, and improve the App.</li>
    <li>To manage your account, subscription, and support requests.</li>
    <li>To send notifications you have opted into.</li>
  </ul>

  <h2>3. AI Processing &amp; Service Providers</h2>
  <p>To deliver coaching, your conversation audio and text are processed by trusted third-party providers acting on our behalf:</p>
  <ul>
    <li><strong>Deepgram</strong> — speech-to-text transcription.</li>
    <li><strong>Anthropic (Claude)</strong> — generates coaching suggestions.</li>
    <li><strong>ElevenLabs</strong> — text-to-speech for whispered coaching.</li>
    <li><strong>Apple &amp; RevenueCat</strong> — payments and subscription management.</li>
    <li><strong>Railway &amp; Cloudflare</strong> — hosting and infrastructure.</li>
  </ul>
  <p>These providers process data only to perform their function. <strong>We do not sell your personal information.</strong></p>

  <h2>4. Data Retention</h2>
  <p>Raw audio is discarded immediately after processing. Transcripts and session data are retained for up to 90 days and then deleted, unless you delete them sooner. Account information is retained until you delete your account.</p>

  <h2>5. Your Rights &amp; Choices</h2>
  <ul>
    <li><strong>Access &amp; deletion:</strong> you can delete your account and associated data at any time from the App's account settings, or by emailing us.</li>
    <li><strong>Notifications:</strong> you can disable notifications in your device settings.</li>
    <li><strong>Microphone:</strong> the App only listens during an active session that you start and stop.</li>
  </ul>

  <h2>6. Consent &amp; Recording</h2>
  <p>You are responsible for complying with recording and consent laws in your jurisdiction. Please review our <a href="/terms">Terms of Service</a> for details.</p>

  <h2>7. Children</h2>
  <p>AI Wingman is not directed to children under 17, and we do not knowingly collect personal information from them.</p>

  <h2>8. Changes to This Policy</h2>
  <p>We may update this policy from time to time. Material changes will be notified in-app or by email.</p>

  <h2>9. Contact</h2>
  <p>Questions about your privacy? Email <a href="mailto:support@rushingtechnologies.com">support@rushingtechnologies.com</a>.</p>
</main>
<footer>© 2026 AI Wingman by Rushing Technologies · <a href="/">Home</a> · <a href="/terms">Terms</a> · <a href="/support">Support</a></footer>
</body>
</html>`,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Static pages
    if (PAGES[path]) {
      return new Response(PAGES[path], {
        headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'public,max-age=300' },
      });
    }

    // POST /join — waitlist signup
    if (path === '/join' && request.method === 'POST') {
      try {
        const { name, email, mode } = await request.json();
        if (!name || !email) return json({ error: 'Name and email are required' }, 400);
        if (!email.includes('@')) return json({ error: 'Invalid email address' }, 400);

        if (env.DB) {
          await env.DB.prepare(
            'INSERT INTO waitlist (name, email, mode, created_at) VALUES (?, ?, ?, ?)'
          ).bind(name.slice(0, 100), email.slice(0, 200), mode || null, new Date().toISOString()).run();
        }
        return json({ ok: true });
      } catch (err) {
        return json({ error: 'Server error' }, 500);
      }
    }

    // POST /contact — support form
    if (path === '/contact' && request.method === 'POST') {
      try {
        const { name, email, topic, message } = await request.json();
        if (!name || !email || !message) return json({ error: 'Name, email, and message are required' }, 400);

        if (env.DB) {
          await env.DB.prepare(
            'INSERT INTO support_requests (name, email, topic, message, created_at) VALUES (?, ?, ?, ?, ?)'
          ).bind(name.slice(0, 100), email.slice(0, 200), topic || null, message.slice(0, 2000), new Date().toISOString()).run();
        }
        return json({ ok: true });
      } catch {
        return json({ error: 'Server error' }, 500);
      }
    }

    return new Response('Not found', { status: 404 });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
