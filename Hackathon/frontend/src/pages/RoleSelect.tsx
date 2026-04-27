import { useNavigate } from 'react-router-dom';

const RoleSelect = () => {
  const navigate = useNavigate();
  const choose = (role: 'customer' | 'merchant') => navigate(`/auth?role=${role}`);

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <header className="px-4 sm:px-10 py-5 sm:py-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <i className="bi bi-wallet2 text-primary-foreground text-lg" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight">Localyse</span>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
          <i className="bi bi-geo-alt" /> Live city intelligence
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-3 xs:px-4 sm:px-6 py-8 sm:py-16">
        <div className="text-center max-w-2xl mb-10 sm:mb-14 animate-fade-up">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary-soft px-3 py-1 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            AI commerce for live city context
          </span>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1] mb-4 text-balance">
            The intelligent wallet for the city you live in.
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto text-balance">
            Real-time, AI-curated commerce. Choose how you'd like to start.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-3xl">
          {[
            {
              id: 'customer' as const,
              icon: 'bi-person',
              title: 'I am a customer',
              desc: 'Discover context-aware offers near you from real merchants.',
            },
            {
              id: 'merchant' as const,
              icon: 'bi-shop',
              title: 'I am a merchant',
              desc: 'Run an AI-powered storefront. Set your goal — we craft the offers.',
            },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => choose(r.id)}
              className="group relative bg-card rounded-2xl p-5 sm:p-8 text-left border border-border hover:border-primary/40 transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-5">
                <i className={`bi ${r.icon} text-xl`} />
              </div>
              <h3 className="text-lg font-semibold mb-1.5 tracking-tight">{r.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{r.desc}</p>
              {r.id === 'merchant' && (
                <p className="text-[11px] text-muted-foreground mb-2">
                  New merchant?{' '}
                  <span
                    role="link"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/merchant-apply');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate('/merchant-apply');
                      }
                    }}
                    className="text-primary font-medium hover:underline cursor-pointer"
                  >
                    Request access
                  </span>{' '}
                  first.
                </p>
              )}
              <span className="text-sm font-medium text-primary inline-flex items-center gap-1.5">
                Continue
                <i className="bi bi-arrow-right transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </main>

      <footer className="px-4 sm:px-10 py-5 sm:py-6 text-xs text-muted-foreground flex items-center justify-between">
        <span>© Localyse</span>
        <span className="hidden sm:inline">Designed for real city data</span>
      </footer>
    </div>
  );
};

export default RoleSelect;
