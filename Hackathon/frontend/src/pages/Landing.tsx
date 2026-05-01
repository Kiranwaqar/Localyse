import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* NAV */}
      <header
        className={
          'sticky top-0 z-40 transition-all ' +
          (scrolled
            ? 'bg-background/80 backdrop-blur-md border-b border-border'
            : 'bg-transparent')
        }
      >
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <i className="bi bi-geo-alt-fill text-primary-foreground text-base" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">Localyse</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#audience" className="hover:text-foreground transition">For you</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/start"
              className="hidden sm:inline-flex h-9 items-center px-3.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition"
            >
              Sign in
            </Link>
            <Link
              to="/start"
              className="inline-flex h-9 items-center px-3 xs:px-4 rounded-lg text-sm font-medium bg-foreground text-background hover:opacity-90 transition whitespace-nowrap"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-10 sm:pt-20 pb-12 sm:pb-28">
        {/* Bubbly pastel shapes */}
        <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-24 h-72 w-72 sm:w-[420px] sm:h-[420px] rounded-full bg-primary-soft blur-3xl opacity-70" />
          <div className="absolute top-32 -right-20 h-64 w-64 sm:w-[360px] sm:h-[360px] rounded-full bg-lavender-soft blur-3xl opacity-80" />
          <div className="absolute bottom-0 left-1/3 h-56 w-56 sm:w-[300px] sm:h-[300px] rounded-full bg-warning-soft blur-3xl opacity-70" />
        </div>

        <div className="relative max-w-7xl mx-auto px-3 xs:px-4 sm:px-8 text-center">
          <span className="inline-flex items-center justify-center gap-2 text-xs font-medium text-primary bg-primary-soft px-3 py-1.5 rounded-full mb-6 mx-auto max-w-full text-center whitespace-normal leading-snug animate-fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span className="min-w-0">Now live with real backend data</span>
            <i className="bi bi-arrow-right text-[10px] shrink-0" />
          </span>

          <h1 className="text-[1.75rem] leading-[1.08] xs:text-4xl xs:leading-[1.05] sm:text-6xl lg:text-7xl font-semibold tracking-tight max-w-4xl mx-auto text-pretty animate-fade-up px-0.5" style={{ animationDelay: '60ms' }}>
            The AI wallet that knows{' '}
            <span className="relative inline-block">
              <span className="relative z-10">your city.</span>
              <span aria-hidden className="absolute left-0 right-0 bottom-1 sm:bottom-2 h-3 sm:h-4 bg-warning-soft rounded-full -z-0" />
            </span>
          </h1>

          <p className="mt-5 sm:mt-7 text-[15px] sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty animate-fade-up px-0.5" style={{ animationDelay: '120ms' }}>
            Localyse turns your city into a smart, real-time marketplace. Discover personal,
            context-aware offers from cafés, retail, and fitness — curated by AI.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: '180ms' }}>
            <Link
              to="/start"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-[hsl(var(--primary-hover))] shadow-md transition active:scale-[0.99]"
            >
              Get started free
              <i className="bi bi-arrow-right" />
            </Link>
            <a
              href="#how"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-card border border-border text-sm font-medium hover:border-foreground/30 transition"
            >
              <i className="bi bi-play-circle" /> See how it works
            </a>
          </div>

          <p className="mt-6 text-xs text-muted-foreground flex items-center justify-center gap-x-3 gap-y-2 sm:gap-4 flex-wrap px-1 animate-fade-up" style={{ animationDelay: '240ms' }}>
            <span className="flex items-center gap-1.5"><i className="bi bi-check2-circle text-success" /> Free for customers</span>
            <span className="flex items-center gap-1.5"><i className="bi bi-shield-check text-success" /> Privacy-first</span>
            <span className="flex items-center gap-1.5"><i className="bi bi-lightning-charge text-success" /> Real-time</span>
          </p>

          {/* Floating product preview */}
          <div className="relative mt-10 sm:mt-20 w-full min-w-0 max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: '300ms' }}>
            <div className="absolute -top-6 -left-4 sm:-left-10 w-20 h-20 rounded-3xl bg-primary-soft border border-primary/20 rotate-[-8deg] hidden sm:flex items-center justify-center shadow-md">
              <i className="bi bi-cup-hot text-primary text-2xl" />
            </div>
            <div className="absolute -top-4 -right-4 sm:-right-10 w-20 h-20 rounded-3xl bg-lavender-soft border border-lavender/20 rotate-[10deg] hidden sm:flex items-center justify-center shadow-md">
              <i className="bi bi-bag text-lavender text-2xl" />
            </div>
            <div className="absolute -bottom-6 left-1/4 w-16 h-16 rounded-2xl bg-warning-soft border border-warning/20 rotate-[6deg] hidden sm:flex items-center justify-center shadow-md">
              <i className="bi bi-stars text-warning-fg text-xl" />
            </div>

            <div className="bg-card border border-border rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden w-full min-w-0">
              <div className="border-b border-border px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground min-w-0 flex-1">
                  <span className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-destructive/60" />
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-warning/60" />
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-success/60" />
                  </span>
                  <span className="ml-1 sm:ml-3 text-[10px] sm:text-xs truncate min-w-0">
                    localyse.app/feed
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0 tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /> Live
                </span>
              </div>
              <div className="p-3 xs:p-5 sm:p-7 bg-gradient-to-b from-transparent to-primary-soft/30">
                <div className="rounded-xl sm:rounded-2xl border border-dashed border-border bg-card/80 p-4 sm:p-6 md:p-8 text-center min-w-0">
                  <i className="bi bi-stars text-2xl text-primary" />
                  <p className="text-sm font-semibold mt-3 text-pretty px-0.5">See offers go live the moment you publish</p>
                  <p className="text-[13px] sm:text-xs text-muted-foreground mt-1.5 max-w-md mx-auto text-pretty leading-relaxed px-0.5">
                    Onboard merchants, launch promotions, and this feed stays in sync with your live data so the preview matches what customers see.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF STRIP */}
      <section className="border-y border-border bg-card/40">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-8 py-8 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6 sm:gap-4 text-center">
          {[
            { icon: 'bi-shop', l: 'Real merchants' },
            { icon: 'bi-broadcast', l: 'Live offers' },
            { icon: 'bi-stars', l: 'AI context' },
            { icon: 'bi-database', l: 'MongoDB-backed' },
          ].map((s) => (
            <div key={s.l}>
              <i className={`bi ${s.icon} text-xl text-primary`} />
              <p className="text-xs text-muted-foreground mt-2">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-8">
          <SectionHeader
            kicker="How it works"
            title="From signal to savings, in three steps."
            subtitle="Localyse listens to the city in real time and delivers offers that actually matter to you."
          />

          <div className="mt-12 sm:mt-16 grid md:grid-cols-3 gap-4 sm:gap-6 relative">
            {[
              { n: '01', icon: 'bi-broadcast-pin', tone: 'primary', title: 'We sense the moment', body: 'Weather, time of day, location, payday cycles, and your preferences become live signals.' },
              { n: '02', icon: 'bi-cpu', tone: 'lavender', title: 'AI curates the offer', body: 'Our model matches signals to merchant goals — surfacing the most relevant offer near you.' },
              { n: '03', icon: 'bi-tag', tone: 'warning', title: 'You claim and save', body: 'Tap to claim. Show the coupon code. Your savings, history, and streak update instantly.' },
            ].map((step, i) => (
              <div
                key={step.n}
                className="relative bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className={
                    'w-12 h-12 rounded-2xl flex items-center justify-center ' +
                    (step.tone === 'primary' ? 'bg-primary-soft text-primary' :
                     step.tone === 'lavender' ? 'bg-lavender-soft text-lavender' :
                     'bg-warning-soft text-warning-fg')
                  }>
                    <i className={`bi ${step.icon} text-xl`} />
                  </div>
                  <span className="text-3xl font-semibold text-muted-foreground/30 tabular-nums">{step.n}</span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight mb-1.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 sm:py-28 bg-card/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-8">
          <SectionHeader
            kicker="Features"
            title="A new operating system for local commerce."
            subtitle="Built for the rhythm of a city — designed for the people who live in it."
          />

          <div className="mt-12 sm:mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard
              tone="primary"
              icon="bi-stars"
              title="AI-driven offers"
              body="Personalised recommendations powered by context — not noisy, not generic."
            />
            <FeatureCard
              tone="lavender"
              icon="bi-geo-alt"
              title="Location intelligence"
              body="Location-aware offers come from real merchants and live context."
            />
            <FeatureCard
              tone="warning"
              icon="bi-lightning-charge"
              title="Real-time updates"
              body="Live countdowns, live availability. Offers pulse with the city."
            />
            <FeatureCard
              tone="primary"
              icon="bi-shield-check"
              title="Privacy first"
              body="Your patterns power your wallet — and only your wallet."
            />
            <FeatureCard
              tone="lavender"
              icon="bi-piggy-bank"
              title="Track every rupee"
              body="See lifetime savings, streaks, and category insights in one calm dashboard."
            />
            <FeatureCard
              tone="warning"
              icon="bi-bell"
              title="Smart notifications"
              body="Only when it actually matters. Never spammy, always timely."
            />
          </div>
        </div>
      </section>

      {/* AUDIENCE — DUAL VALUE PROP */}
      <section id="audience" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-8">
          <SectionHeader
            kicker="Built for both sides"
            title="Two products. One city. One wallet."
            subtitle="Localyse connects people who love their neighbourhood with the businesses that power it."
          />

          <div className="mt-12 sm:mt-16 grid md:grid-cols-2 gap-4 sm:gap-6">
            <AudienceCard
              tone="pink"
              icon="bi-person-heart"
              kicker="For customers"
              title="Discover the city, save effortlessly."
              points={[
                'Context-aware offers from real nearby merchants',
                'Live map of nearby deals with instant claim',
                'Lifetime savings, streaks, and a tidy receipt history',
              ]}
              cta="I'm a customer"
              ctaHref="/start"
            />
            <AudienceCard
              tone="lavender"
              icon="bi-shop"
              kicker="For merchants"
              title="Set the goal — AI writes the offer."
              points={[
                'No more manual coupons. Just goals and constraints.',
                'Real-time analytics, peak-hour insights, audience trends',
                'Reach the right person at the right moment, always',
              ]}
              cta="I'm a merchant"
              ctaHref="/start"
            />
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-8">
          <div className="relative bg-card border border-border rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-14 text-center overflow-hidden shadow-md">
            <div aria-hidden className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 -left-10 w-72 h-72 rounded-full bg-primary-soft blur-3xl opacity-80" />
              <div className="absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-lavender-soft blur-3xl opacity-80" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-warning-soft blur-3xl opacity-60" />
            </div>
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary-soft px-3 py-1.5 rounded-full mb-5">
                <i className="bi bi-rocket-takeoff text-[11px]" /> Join the waitlist
              </span>
              <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight max-w-2xl mx-auto text-balance">
                Make your city work for you.
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-balance">
                Be the first to experience AI-curated commerce powered by real city data.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/start"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-[hsl(var(--primary-hover))] shadow-md transition"
                >
                  Get started free <i className="bi bi-arrow-right" />
                </Link>
                <a
                  href="#features"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-card border border-border text-sm font-medium hover:border-foreground/30 transition"
                >
                  Learn more
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card/40">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-8 py-12 sm:py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
            <div className="lg:col-span-1">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                  <i className="bi bi-geo-alt-fill text-primary-foreground text-base" />
                </div>
                <span className="font-semibold text-[15px] tracking-tight">Localyse</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                The AI-powered wallet for hyperlocal commerce, built for real city data.
              </p>
              <div className="flex items-center gap-2 mt-5">
                {[
                  { i: 'bi-twitter-x', l: 'Twitter' },
                  { i: 'bi-instagram', l: 'Instagram' },
                  { i: 'bi-linkedin', l: 'LinkedIn' },
                  { i: 'bi-github', l: 'GitHub' },
                ].map((s) => (
                  <a
                    key={s.l}
                    href="#"
                    aria-label={s.l}
                    className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
                  >
                    <i className={`bi ${s.i} text-sm`} />
                  </a>
                ))}
              </div>
            </div>

            <FooterCol title="Product" links={['Features', 'How it works', 'For customers', 'For merchants']} />
            <FooterCol title="Company" links={['About', 'Careers', 'Press', 'Contact']} />
            <FooterCol title="Resources" links={['Privacy', 'Terms', 'Security', 'Status']} />
          </div>

          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Localyse. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              <i className="bi bi-geo-alt" /> Made for live cities
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ---------- Sub-components ---------- */

const SectionHeader = ({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) => (
  <div className="text-center max-w-2xl mx-auto px-0.5">
    <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary-soft px-2.5 py-1 rounded-full mb-4">
      {kicker}
    </span>
    <h2 className="text-[1.625rem] xs:text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.12] sm:leading-[1.1] text-pretty">
      {title}
    </h2>
    <p className="mt-4 text-[15px] sm:text-base text-muted-foreground leading-relaxed text-pretty">{subtitle}</p>
  </div>
);

const FeatureCard = ({ icon, title, body, tone }: {
  icon: string; title: string; body: string; tone: 'primary' | 'lavender' | 'warning';
}) => {
  const tones: Record<string, string> = {
    primary: 'bg-primary-soft text-primary',
    lavender: 'bg-lavender-soft text-lavender',
    warning: 'bg-warning-soft text-warning-fg',
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition">
      <div className={'w-11 h-11 rounded-xl flex items-center justify-center mb-4 ' + tones[tone]}>
        <i className={`bi ${icon} text-lg`} />
      </div>
      <h3 className="text-base font-semibold tracking-tight mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
};

const AudienceCard = ({ tone, icon, kicker, title, points, cta, ctaHref }: {
  tone: 'pink' | 'lavender'; icon: string; kicker: string; title: string;
  points: string[]; cta: string; ctaHref: string;
}) => {
  const isPink = tone === 'pink';
  return (
    <div className={
      'relative rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-9 border overflow-hidden ' +
      (isPink ? 'bg-primary-soft border-primary/20' : 'bg-lavender-soft border-lavender/20')
    }>
      <div aria-hidden className={
        'absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-50 ' +
        (isPink ? 'bg-warning-soft' : 'bg-primary-soft')
      } />
      <div className="relative">
        <div className={
          'w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ' +
          (isPink ? 'bg-primary text-primary-foreground' : 'bg-lavender text-lavender-foreground')
        }>
          <i className={`bi ${icon} text-xl`} />
        </div>
        <p className={'text-[11px] font-semibold uppercase tracking-wider mb-2 ' + (isPink ? 'text-primary' : 'text-lavender')}>
          {kicker}
        </p>
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight text-balance">{title}</h3>

        <ul className="mt-6 space-y-3">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-foreground/80">
              <i className={'bi bi-check-circle-fill mt-0.5 ' + (isPink ? 'text-primary' : 'text-lavender')} />
              <span className="leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>

        <Link
          to={ctaHref}
          className={
            'mt-7 inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-medium transition ' +
            (isPink
              ? 'bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))]'
              : 'bg-lavender text-lavender-foreground hover:opacity-90')
          }
        >
          {cta} <i className="bi bi-arrow-right" />
        </Link>
      </div>
    </div>
  );
};

const FooterCol = ({ title, links }: { title: string; links: string[] }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground mb-3">{title}</p>
    <ul className="space-y-2">
      {links.map((l) => (
        <li key={l}>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition">{l}</a>
        </li>
      ))}
    </ul>
  </div>
);

export default Landing;
