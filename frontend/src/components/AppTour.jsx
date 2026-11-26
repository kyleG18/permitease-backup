import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProductOnboarding } from '../context/ProductOnboardingContext';
import { useTranslation } from '../context/LanguageContext';
import { X, ChevronLeft, ChevronRight, CheckCircle, Menu } from 'lucide-react';

/* ─────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────── */
const TOOLTIP_W = 370;
const PAD = 20;
const SPOTLIGHT_PAD = 8;
const BORDER_R = 10;
const TRANSITION = '0.3s cubic-bezier(0.4,0,0.2,1)';

const STEP_TL = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Pangkalahatang-ideya ng iyong negosyo',
    description: 'Ito ang iyong pangunahing pahina. Makikita mo rito ang status ng iyong permit, mga deadline, at progreso ng iyong paghahanda.',
    nextLabel: 'Susunod: Aking Negosyo'
  },
  'my-business': {
    title: 'Aking Negosyo',
    subtitle: 'Profile at detalye ng negosyo',
    description: 'Siguraduhing kumpleto ang detalye ng iyong negosyo at petsa ng pagkapaso ng DTI/SEC. Dito ibinabatay ng PermitEase ang iyong mga requirements.',
    nextLabel: 'Susunod: AI Assessment'
  },
  'ai-assessment': {
    title: 'AI Permit Assessment',
    subtitle: 'Alamin ang kailangang permit',
    description: 'Gamitin ang AI assessment upang agad malaman ang mga permit, clearance, at PSA PSIC code na akma sa iyong negosyo, at i-print ang iyong checklist.',
    nextLabel: 'Susunod: Buwis (BIR)'
  },
  'tax-estimation': {
    title: 'Estimador ng Buwis (BIR)',
    subtitle: 'Tinatayang buwis sa BIR',
    description: 'Makita ang tinatayang buwis sa BIR (8% flat, VAT, o Corporate) bago ka magtungo sa Municipal Treasurer\'s Office.',
    nextLabel: 'Susunod: Bayarin sa Permit'
  },
  'fee-estimation': {
    title: 'Estimador ng Bayarin',
    subtitle: 'Tinatayang bayarin sa munisipyo',
    description: 'Tingnan ang tinatayang bayarin para sa Mayor\'s Permit, Sanitary Permit, Zoning, FSIC, at iba pa upang makapaghanda ng budget.',
    nextLabel: 'Susunod: Aplikasyon'
  },
  'prepare-application': {
    title: 'Maghanda ng Aplikasyon',
    subtitle: 'Subaybayan ang iyong aplikasyon',
    description: 'Isumite at subaybayan ang iyong pre-assessment dito. Maaari mong i-download ang pre-filled na Roxas Form BPLO-01.',
    nextLabel: 'Susunod: Walk-in Schedule'
  },
  'schedule-walkin': {
    title: 'Schedule ng Walk-in',
    subtitle: 'Mag-book ng slot sa Window 1',
    description: 'Pumili ng petsa ng punta sa Roxas BPLO (Umaga o Hapon) at kunin ang iyong Queue Ticket upang hindi na pumila nang matagal.',
    nextLabel: 'Susunod: AI Assistant'
  },
  'ai-help': {
    title: 'AI Permit Assistant',
    subtitle: 'Magtanong kahit kailan',
    description: 'May tanong tungkol sa requirements, bayarin, o proseso ng BPLO? Handang sumagot ang AI Assistant sa Tagalog o English.',
    nextLabel: 'Tapusin'
  }
};

/* ─────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────── */
function getRect(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    x: r.left - SPOTLIGHT_PAD,
    y: r.top - SPOTLIGHT_PAD,
    w: r.width + SPOTLIGHT_PAD * 2,
    h: r.height + SPOTLIGHT_PAD * 2,
  };
}

function getTooltipStyle(spot, viewW, viewH, cardH = 310) {
  const cardW = Math.min(TOOLTIP_W, Math.max(300, viewW - 24));
  const safeH = Math.min(cardH, viewH - 32);

  if (!spot) {
    return {
      top: Math.max(PAD, Math.round((viewH - safeH) / 2)),
      left: Math.max(12, Math.round((viewW - cardW) / 2)),
    };
  }

  const spRight = spot.x + spot.w;
  const spBottom = spot.y + spot.h;
  const spCenterY = spot.y + spot.h / 2;

  // Prefer right of spotlight (ideal for left civic sidebar on desktop)
  if (spRight + PAD + cardW < viewW) {
    return {
      left: spRight + PAD,
      top: Math.max(PAD, Math.min(spCenterY - safeH / 2, viewH - safeH - PAD)),
    };
  }
  // Try left
  if (spot.x - PAD - cardW > 0) {
    return {
      left: spot.x - PAD - cardW,
      top: Math.max(PAD, Math.min(spCenterY - safeH / 2, viewH - safeH - PAD)),
    };
  }
  // Below
  if (spBottom + PAD + safeH < viewH) {
    return {
      top: spBottom + PAD,
      left: Math.max(PAD, Math.min(spot.x, viewW - cardW - PAD)),
    };
  }
  // Above
  return {
    top: Math.max(PAD, spot.y - PAD - safeH),
    left: Math.max(PAD, Math.min(spot.x, viewW - cardW - PAD)),
  };
}

/* ─────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────── */
export default function AppTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useTranslation();
  const isTl = lang === 'tl';

  const {
    onboardingState,
    currentStep,
    isVisible,
    nextStep,
    prevStep,
    complete,
    dismiss,
    markStepVisited,
    totalSteps,
    ONBOARDING_STEPS: steps,
  } = useProductOnboarding();

  const [spot, setSpot] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 96, left: 280 });
  const [tourOpen, setTourOpen] = useState(false);
  const [viewSize, setViewSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const rafRef = useRef(null);
  const cardRef = useRef(null);

  const isAuthOrOnboardingRoute =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/onboarding';

  useEffect(() => {
    if (isAuthOrOnboardingRoute) {
      setTourOpen(false);
      return;
    }
    if (isVisible && !onboardingState?.completed) {
      setTourOpen(true);
    } else if (!isVisible) {
      setTourOpen(false);
    }
  }, [isVisible, onboardingState?.completed, isAuthOrOnboardingRoute]);

  useEffect(() => {
    if (!tourOpen || !currentStep || isAuthOrOnboardingRoute) return;
    if (location.pathname !== currentStep.path) {
      navigate(currentStep.path);
    }
  }, [tourOpen, currentStep?.id, isAuthOrOnboardingRoute]); // eslint-disable-line

  useEffect(() => {
    if (!tourOpen || !currentStep) return;
    if (location.pathname === currentStep.path) {
      markStepVisited(currentStep.id);
    }
  }, [location.pathname, tourOpen, currentStep?.id]); // eslint-disable-line

  const measure = useCallback((retry = 0) => {
    if (!tourOpen || !currentStep) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setViewSize({ w: vw, h: vh });

    // On mobile (< 768px): highlight the top-left menu button on Step 1 so users learn where nav lives,
    // and keep other steps unobstructed above the bottom sheet.
    if (vw < 768) {
      if (currentStep.stepNumber === 1) {
        const menuEl = document.querySelector('.menu-btn');
        setSpot(getRect(menuEl));
      } else {
        setSpot(null);
      }
      return;
    }

    const el = document.querySelector(`[data-tour="${currentStep.id}"]`);
    if (!el && retry < 5) {
      setTimeout(() => measure(retry + 1), 200);
      return;
    }

    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    const rect = getRect(el);
    const measuredH = cardRef.current?.offsetHeight || 310;
    setSpot(rect);
    setTooltipPos(getTooltipStyle(rect, vw, vh, measuredH));
  }, [tourOpen, currentStep?.id, currentStep?.stepNumber]); // eslint-disable-line

  useEffect(() => {
    if (!tourOpen) return;
    const t = setTimeout(() => measure(), 320);

    const onResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => measure());
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [tourOpen, currentStep?.id, location.pathname, measure]);

  useEffect(() => {
    if (!tourOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') { dismiss(); setTourOpen(false); }
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && e.target.tagName !== 'BUTTON')) handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tourOpen, currentStep?.id]); // eslint-disable-line

  if (!tourOpen || !currentStep) return null;

  const currentIdx = steps.findIndex(s => s.id === currentStep.id);
  const isLast = currentIdx >= steps.length - 1;
  const progress = ((currentIdx + 1) / totalSteps) * 100;

  const tlOverride = isTl ? STEP_TL[currentStep.id] : null;
  const displayTitle = tlOverride?.title || currentStep.title;
  const displaySubtitle = tlOverride?.subtitle || currentStep.subtitle;
  const displayDesc = tlOverride?.description || currentStep.description;
  const displayNext = tlOverride?.nextLabel || (currentStep.nextLabel ? currentStep.nextLabel.replace(' →', '') : 'Next');

  function handleNext() {
    if (isLast) {
      complete();
      setTourOpen(false);
    } else {
      const nextDef = steps[currentIdx + 1];
      nextStep();
      if (nextDef) navigate(nextDef.path);
    }
  }

  function handlePrev() {
    if (currentIdx <= 0) return;
    const prevDef = steps[currentIdx - 1];
    prevStep();
    if (prevDef) navigate(prevDef.path);
  }

  function handleClose() {
    dismiss();
    setTourOpen(false);
  }

  const { w: vw, h: vh } = viewSize;
  const isMobile = vw < 768;

  const dialogStyle = isMobile ? {
    position: 'fixed',
    bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    left: '10px',
    right: '10px',
    width: 'auto',
    maxWidth: '460px',
    margin: '0 auto',
    maxHeight: 'calc(100dvh - 88px)',
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'all',
    zIndex: 9999,
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #C9D6CE',
    boxShadow: '0 20px 50px -10px rgba(12, 43, 24, 0.35)',
    fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif",
  } : {
    position: 'absolute',
    top: tooltipPos.top,
    left: tooltipPos.left,
    width: Math.min(TOOLTIP_W, Math.max(300, viewSize.w - 24)),
    maxWidth: 'calc(100vw - 24px)',
    pointerEvents: 'all',
    zIndex: 9999,
    borderRadius: '14px',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #C9D6CE',
    boxShadow: '0 20px 50px -10px rgba(12, 43, 24, 0.32)',
    fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif",
    transition: `top ${TRANSITION}, left ${TRANSITION}`,
  };

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9990, pointerEvents: 'none' }}
      aria-hidden="false"
    >
      {/* ── SVG Overlay with spotlight cutout (lighter on mobile so user sees the page) ── */}
      <svg
        width={vw}
        height={vh}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'all',
          cursor: 'default',
        }}
        aria-hidden="true"
        onClick={handleClose}
      >
        <defs>
          <mask id="pe-spotlight-mask">
            <rect x="0" y="0" width={vw} height={vh} fill="white" />
            {spot && (
              <rect
                x={spot.x}
                y={spot.y}
                width={spot.w}
                height={spot.h}
                rx={BORDER_R}
                ry={BORDER_R}
                fill="black"
                style={{ transition: `x ${TRANSITION}, y ${TRANSITION}, width ${TRANSITION}, height ${TRANSITION}` }}
              />
            )}
          </mask>
        </defs>

        <rect
          x="0" y="0"
          width={vw} height={vh}
          fill={isMobile ? 'rgba(15, 23, 42, 0.45)' : 'rgba(12, 32, 20, 0.72)'}
          mask="url(#pe-spotlight-mask)"
        />

        {/* Civic Gold spotlight ring (high contrast on deep forest sidebar) */}
        {spot && (
          <>
            <rect
              x={spot.x - 3}
              y={spot.y - 3}
              width={spot.w + 6}
              height={spot.h + 6}
              rx={BORDER_R + 2}
              ry={BORDER_R + 2}
              fill="none"
              stroke="rgba(245, 158, 11, 0.42)"
              strokeWidth="7"
              style={{ filter: 'blur(3px)', transition: `x ${TRANSITION}, y ${TRANSITION}, width ${TRANSITION}, height ${TRANSITION}` }}
            />
            <rect
              x={spot.x}
              y={spot.y}
              width={spot.w}
              height={spot.h}
              rx={BORDER_R}
              ry={BORDER_R}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.5"
              style={{ transition: `x ${TRANSITION}, y ${TRANSITION}, width ${TRANSITION}, height ${TRANSITION}` }}
            />
          </>
        )}
      </svg>

      {/* ── Tooltip / Mobile Bottom Sheet Card ── */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${isTl ? 'Hakbang' : 'Step'} ${currentStep.stepNumber} / ${totalSteps}: ${displayTitle}`}
        style={dialogStyle}
      >
        {/* ── Header (Civic Forest Green) ── */}
        <div style={{
          background: 'linear-gradient(135deg, #113B22 0%, #14532D 100%)',
          padding: isMobile ? '0.85rem 1.1rem 0.9rem' : '1.1rem 1.25rem 1rem',
          position: 'relative',
          flexShrink: 0,
        }}>
          {/* Mobile drag handle indicator */}
          {isMobile && (
            <div style={{
              width: '38px', height: '4px', borderRadius: '999px',
              backgroundColor: 'rgba(255,255,255,0.35)',
              margin: '0 auto 0.65rem'
            }} />
          )}

          {/* Step badge & Close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                backgroundColor: '#FEF3C7',
                border: '2px solid #F59E0B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '800', color: '#92400E',
                flexShrink: 0,
              }}>
                {currentStep.stepNumber}
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#FEF3C7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {isTl ? `Hakbang ${currentStep.stepNumber} sa ${totalSteps}` : `Step ${currentStep.stepNumber} of ${totalSteps}`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label={isTl ? 'Isara ang gabay' : 'Close tour'}
              style={{
                background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.24)',
                color: '#FFFFFF', cursor: 'pointer', padding: '5px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px'
              }}
            >
              <X size={16} />
            </button>
          </div>

          <h3 style={{ margin: '0 0 3px', fontSize: isMobile ? '17px' : '18.5px', fontWeight: '800', color: '#FFFFFF', lineHeight: 1.25 }}>
            {displayTitle}
          </h3>
          <div style={{ fontSize: isMobile ? '13px' : '13.5px', color: '#CFE3D6', fontWeight: '500' }}>
            {displaySubtitle}
          </div>
        </div>

        {/* ── Progress bar (Municipal Gold on Forest Track) ── */}
        <div style={{ height: '5px', backgroundColor: '#0C2B18', position: 'relative', flexShrink: 0 }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
            transition: `width ${TRANSITION}`,
          }} />
        </div>

        {/* ── Body ── */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: isMobile ? '1rem 1.1rem 1rem' : '1.15rem 1.25rem 1.1rem',
          overflowY: 'auto',
          flex: '1 1 auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <p style={{ margin: '0 0 0.95rem', fontSize: isMobile ? '14.5px' : '15px', color: '#1E293B', lineHeight: 1.6, fontWeight: 500 }}>
            {displayDesc}
          </p>

          {/* Mobile navigation hint */}
          {isMobile && (
            <div style={{
              backgroundColor: '#F4F8F5', border: '1.5px solid #C9D6CE',
              borderRadius: '8px', padding: '0.6rem 0.75rem',
              marginBottom: '0.95rem', fontSize: '13px', color: '#14532D',
              display: 'flex', alignItems: 'center', gap: '0.5rem', lineHeight: 1.45, fontWeight: 600
            }}>
              <Menu size={16} style={{ flexShrink: 0 }} />
              <span>
                {isTl
                  ? <>Pindutin ang <strong>Menu (☰)</strong> sa taas → <strong>{displayTitle}</strong></>
                  : <>Tap <strong>Menu (☰)</strong> at top → <strong>{displayTitle}</strong></>}
              </span>
            </div>
          )}

          {/* Action buttons (Senior-friendly 44px height) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: 'none', border: 'none',
                color: '#374151',
                fontSize: '13.5px', fontWeight: '700', cursor: 'pointer',
                padding: '0.5rem 0.25rem',
                minHeight: '44px',
                textDecoration: 'underline', textUnderlineOffset: '3px',
              }}
            >
              {isTl ? 'Laktawan' : 'Skip tour'}
            </button>

            <div style={{ display: 'flex', gap: '0.5rem', flex: isMobile ? '1 1 auto' : '0 0 auto', justifyContent: 'flex-end' }}>
              {currentIdx > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    backgroundColor: '#FFFFFF',
                    color: '#14532D', border: '1.5px solid #8FA397',
                    borderRadius: '8px', padding: '0.55rem 0.95rem',
                    minHeight: '44px',
                    fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                  }}
                >
                  <ChevronLeft size={16} /> {isTl ? 'Bumalik' : 'Back'}
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  background: '#14532D',
                  color: '#FFFFFF',
                  border: '1.5px solid #14532D', borderRadius: '8px',
                  padding: '0.55rem 1.1rem',
                  minHeight: '44px',
                  fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(17, 59, 34, 0.28)',
                }}
              >
                {isLast
                  ? <><CheckCircle size={16} /> {isTl ? 'Tapusin' : 'Finish'}</>
                  : <>{displayNext} <ChevronRight size={16} /></>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
