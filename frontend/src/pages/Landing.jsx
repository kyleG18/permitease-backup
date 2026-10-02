import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, RefreshCw, ListChecks, Coins, ShieldCheck, Landmark, User, BarChart3, CheckCircle, ArrowRight, Menu, X } from 'lucide-react';

const Landing = () => {
  const [showModal, setShowModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── GLOBAL RESPONSIVE STYLES ── */}
      <style>{`
        * { box-sizing: border-box; }

        /* Smooth scrolling */
        html { scroll-behavior: smooth; }

        /* Services grid */
        .services-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2.5rem;
        }
        .support-box {
          grid-column: span 2;
        }

        /* How It Works steps */
        .steps-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: nowrap;
        }
        .step-arrow { display: flex; }

        /* Footer layout */
        .footer-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
        }
        .footer-links { display: flex; gap: 2rem; align-items: center; }

        /* Hero gradient — desktop: left-to-right fade */
        .hero-gradient {
          background: linear-gradient(to right,
            rgba(255,255,255,1) 0%,
            rgba(255,255,255,1) 40%,
            rgba(255,255,255,0.8) 55%,
            rgba(255,255,255,0) 100%);
        }

        /* Hero heading sizes */
        .hero-h1 { font-size: 4rem; }
        .hero-h2 { font-size: 2.5rem; }
        .hero-btns { display: flex; gap: 1rem; flex-wrap: wrap; }

        /* Nav desktop */
        .nav-desktop { display: flex; gap: 2.5rem; align-items: center; }
        .nav-mobile { display: none; }
        .mobile-menu { display: none; }

        /* Section headings */
        .section-h2 { font-size: 2.5rem; }

        @media (max-width: 1024px) {
          .services-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 2rem;
          }
          .hero-h1 { font-size: 3rem; }
          .hero-h2 { font-size: 2rem; }
        }

        @media (max-width: 768px) {
          /* Nav */
          .nav-desktop { display: none; }
          .nav-mobile { display: flex; align-items: center; gap: 1rem; }
          .mobile-menu {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: #1E3A8A;
            z-index: 200;
            align-items: center;
            justify-content: center;
            gap: 2rem;
          }

          /* Hero */
          .hero-gradient {
            background: linear-gradient(to bottom,
              rgba(255,255,255,0.97) 0%,
              rgba(255,255,255,0.97) 60%,
              rgba(255,255,255,0.7) 80%,
              rgba(255,255,255,0) 100%);
          }
          .hero-section {
            padding: 5rem 6% 9rem 6% !important;
            min-height: 100svh !important;
            align-items: flex-start !important;
          }
          .hero-h1 { font-size: 2.6rem; }
          .hero-h2 { font-size: 1.55rem; }
          .hero-btns {
            flex-direction: column;
            gap: 0.75rem;
          }
          .hero-btns button { width: 100%; justify-content: center; }

          /* Services */
          .services-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .support-box {
            grid-column: span 1;
            flex-direction: column !important;
            text-align: center;
          }
          .section-h2 { font-size: 1.8rem; }

          /* Steps */
          .steps-row {
            flex-direction: column;
            gap: 1.5rem;
          }
          .step-arrow { display: none; }

          /* Footer */
          .footer-inner { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
          .footer-links { flex-direction: row; gap: 1.5rem; }
          .footer-tagline { display: none; }
        }

        @media (max-width: 480px) {
          .hero-h1 { font-size: 2.1rem; }
          .hero-h2 { font-size: 1.3rem; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.25rem 5%', backgroundColor: '#ffffff',
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '1px solid #F1F5F9',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/images/roxas-seal.png" alt="Roxas Seal" style={{ width: '50px', height: '50px', objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3 }}>
              Province of Oriental Mindoro
            </div>
            <h1 style={{ fontSize: '1.15rem', margin: 0, color: '#1E3A8A', fontWeight: '800', lineHeight: 1.2 }}>Municipality of Roxas</h1>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="nav-desktop">
          <a href="#" style={{ color: '#0F172A', fontSize: '0.95rem', fontWeight: '600', textDecoration: 'none', position: 'relative', paddingBottom: '4px', borderBottom: '3px solid #16A34A' }}>Home</a>
          <a href="#services" style={{ color: '#475569', fontSize: '0.95rem', fontWeight: '600', textDecoration: 'none' }}>Services</a>
          <a href="#how-it-works" style={{ color: '#475569', fontSize: '0.95rem', fontWeight: '600', textDecoration: 'none' }}>About</a>
          <button onClick={() => navigate('/login')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#1E3A8A', color: 'white', padding: '0.6rem 1.4rem', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}>
            <User size={15} /> Login
          </button>
        </nav>

        {/* Mobile Nav Toggle */}
        <div className="nav-mobile">
          <button onClick={() => navigate('/login')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#1E3A8A', color: 'white', padding: '0.55rem 1rem', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>
            <User size={14} /> Login
          </button>
          <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#1E3A8A' }}>
            <Menu size={26} />
          </button>
        </div>
      </header>

      {/* ── MOBILE FULL-SCREEN MENU ── */}
      {mobileMenuOpen && (
        <div className="mobile-menu">
          <button onClick={() => setMobileMenuOpen(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
            <X size={30} />
          </button>
          <a href="#" onClick={() => setMobileMenuOpen(false)} style={{ color: 'white', fontSize: '1.5rem', fontWeight: '700', textDecoration: 'none' }}>Home</a>
          <a href="#services" onClick={() => setMobileMenuOpen(false)} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.5rem', fontWeight: '600', textDecoration: 'none' }}>Services</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.5rem', fontWeight: '600', textDecoration: 'none' }}>About</a>
          <button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }} style={{ backgroundColor: '#16A34A', color: 'white', padding: '0.85rem 2.5rem', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', marginTop: '1rem' }}>
            Login to Portal
          </button>
        </div>
      )}

      {/* ── HERO SECTION ── */}
      <section className="hero-section" style={{
        position: 'relative',
        display: 'flex',
        padding: '7rem 5% 10rem 5%',
        alignItems: 'center',
        minHeight: '85vh',
        overflow: 'hidden',
      }}>
        {/* Background Image */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("/images/roxas-building.jpg")', backgroundSize: 'cover', backgroundPosition: 'center top', zIndex: 0 }} />

        {/* Gradient Overlay */}
        <div className="hero-gradient" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />

        {/* Text Content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '36px', height: '4px', backgroundColor: '#16A34A', flexShrink: 0 }} />
            <span style={{ color: '#374151', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Official Business Permit Preparation & Support Portal
            </span>
          </div>

          <h1 className="hero-h1" style={{ fontWeight: '900', margin: '0 0 0.4rem 0', color: '#1E3A8A', lineHeight: 1.05 }}>
            PermitEase
          </h1>
          <h2 className="hero-h2" style={{ fontWeight: '700', margin: '0 0 1.25rem 0', color: '#1E3A8A', lineHeight: 1.2 }}>
            Your Business Permit<br />Preparation, Made Simple.
          </h2>

          <p style={{ fontSize: '1rem', margin: '0 0 2rem 0', color: '#374151', lineHeight: 1.65, maxWidth: '480px' }}>
            Prepare your requirements, track your progress, monitor your readiness, and stay informed — all in one place, before you visit the BPLO.
          </p>

          <div className="hero-btns">
            <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#16A34A', color: 'white', padding: '0.85rem 1.5rem', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer' }}>
              <FileText size={17} /> Start New Business &rarr;
            </button>
            <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ffffff', color: '#16A34A', padding: '0.85rem 1.5rem', borderRadius: '6px', border: '1.5px solid #16A34A', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer' }}>
              <RefreshCw size={17} /> Prepare Renewal &rarr;
            </button>
            <button onClick={() => navigate('/login')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ffffff', color: '#1E3A8A', padding: '0.85rem 1.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer' }}>
              <User size={17} /> Login to Portal
            </button>
          </div>
        </div>

        {/* Slanted Green Wave */}
        <svg viewBox="0 0 1440 120" style={{ position: 'absolute', bottom: -1, left: 0, width: '100%', height: 'auto', zIndex: 3, display: 'block' }} preserveAspectRatio="none">
          <polygon points="0,0 1440,80 1440,121 0,121" fill="#16A34A" />
        </svg>
      </section>

      {/* ── SERVICES SECTION ── */}
      <section id="services" style={{ padding: '5rem 5%', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '36px', height: '4px', backgroundColor: '#16A34A' }} />
            <span style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Our Services</span>
          </div>

          <h2 className="section-h2" style={{ fontWeight: '800', margin: '0 0 1rem 0', color: '#1E3A8A' }}>
            Everything You Need for<br />Business Permit Compliance
          </h2>
          <p style={{ fontSize: '1rem', margin: '0 0 3.5rem 0', color: '#475569', lineHeight: 1.65, maxWidth: '680px' }}>
            PermitEase helps business owners understand what they need before applying, organize their requirements, monitor their application status, and stay informed about upcoming renewals.
          </p>

          <div className="services-grid">
            {[
              { icon: <ListChecks size={26} />, title: 'Permit Requirements', desc: 'View the complete list of required documents based on your business type and category.' },
              { icon: <Coins size={26} />, title: 'Tax & Fee Estimation', desc: 'Get an estimated amount of applicable taxes and regulatory fees based on configured LGU rules.' },
              { icon: <ShieldCheck size={26} />, title: 'Permit Readiness', desc: 'Track your compliance status and see which requirements are still pending or completed.' },
              { icon: <FileText size={26} />, title: 'Preparation Summary', desc: 'Generate a complete summary of your prepared documents and compliance status before your BPLO visit.' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ width: '58px', height: '58px', backgroundColor: '#E2E8F0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', color: '#1E3A8A' }}>
                  {s.icon}
                </div>
                <h3 style={{ fontSize: '1.15rem', color: '#1E3A8A', margin: '0 0 0.6rem 0', fontWeight: '700' }}>{s.title}</h3>
                <p style={{ color: '#475569', margin: 0, lineHeight: 1.6, fontSize: '0.95rem' }}>{s.desc}</p>
              </div>
            ))}

            {/* Support Box */}
            <div className="support-box" style={{ backgroundColor: '#F1F5F9', borderLeft: '4px solid #16A34A', padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', borderRadius: '4px' }}>
              <div style={{ color: '#1E3A8A', flexShrink: 0 }}>
                <Landmark size={44} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: '#1E3A8A', margin: '0 0 0.4rem 0', fontWeight: '800' }}>Supporting a More Business-Friendly Municipality</h3>
                <p style={{ color: '#475569', margin: 0, fontSize: '0.97rem' }}>Together for a stronger, more competitive Roxas.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: '5rem 5%', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 className="section-h2" style={{ fontWeight: '800', margin: '0 0 0.5rem 0', color: '#1E3A8A' }}>How It Works</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
            <div style={{ width: '36px', height: '4px', backgroundColor: '#16A34A' }} />
            <span style={{ color: '#64748B', fontSize: '0.95rem', fontWeight: '500' }}>Get started in just a few simple steps.</span>
          </div>

          <div className="steps-row">
            {[
              { num: '01', icon: <User size={22} />, title: 'Create Account', desc: 'Register and set up your business profile.' },
              { num: '02', icon: <ListChecks size={22} />, title: 'Complete Requirements', desc: 'Upload necessary documents and answer the assessment questions.' },
              { num: '03', icon: <BarChart3 size={22} />, title: 'Track Readiness', desc: 'Monitor your compliance status and get AI-powered insights.' },
              { num: '04', icon: <CheckCircle size={22} />, title: 'Get Your Summary', desc: 'View your preparation summary and estimated fees.' },
            ].map((step, i, arr) => (
              <>
                <div key={step.num} style={{ flex: '1', minWidth: '160px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#1E3A8A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>{step.num}</div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {step.icon}
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', color: '#1E3A8A', margin: '0 0 0.4rem 0', fontWeight: '700' }}>{step.title}</h3>
                  <p style={{ color: '#475569', margin: 0, fontSize: '0.9rem', lineHeight: 1.55 }}>{step.desc}</p>
                </div>
                {i < arr.length - 1 && (
                  <div key={`arrow-${i}`} className="step-arrow" style={{ alignItems: 'center', paddingTop: '20px', flexShrink: 0 }}>
                    <ArrowRight size={22} color="#CBD5E1" />
                  </div>
                )}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="about" style={{ backgroundColor: '#16A34A', color: 'white', padding: '2.5rem 5%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="footer-inner" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.75rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <img src="/images/roxas-seal.png" alt="Roxas Seal" style={{ width: '52px', height: '52px', backgroundColor: 'white', borderRadius: '50%', padding: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.4 }}>Republic of the Philippines<br />Province of Oriental Mindoro</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>Municipality of Roxas</div>
              </div>
            </div>

            <div className="footer-links">
              <a href="#" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>Home</a>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
              <a href="#services" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.9rem' }}>Services</a>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
              <a href="#how-it-works" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.9rem' }}>About</a>
            </div>

            <div className="footer-tagline" style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', textAlign: 'right', lineHeight: 1.5 }}>
              Roxas: A Municipality<br />of Progress and Opportunity
            </div>
          </div>

          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
            &copy; {new Date().getFullYear()} Municipality of Roxas. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ── AUTH MODAL ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="card animate-slide-up" style={{ width: '100%', maxWidth: '420px', textAlign: 'center', padding: '2.5rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
            <h2 style={{ color: '#1E3A8A', marginBottom: '0.5rem', fontWeight: '800', fontSize: '1.4rem' }}>Welcome to PermitEase</h2>
            <p style={{ color: '#64748B', marginBottom: '2rem', fontSize: '0.95rem' }}>Please log in or register to continue.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button onClick={() => navigate('/login')} style={{ padding: '1rem', backgroundColor: '#1E3A8A', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' }}>
                Log In to Existing Account
              </button>
              <button onClick={() => navigate('/register')} style={{ padding: '1rem', backgroundColor: 'transparent', color: '#1E3A8A', border: '1.5px solid #1E3A8A', borderRadius: '6px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' }}>
                Register New Business
              </button>
            </div>

            <button onClick={() => setShowModal(false)} style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Landing;
