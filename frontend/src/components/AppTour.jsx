import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProductOnboarding, ONBOARDING_STEPS } from '../context/ProductOnboardingContext';
import { X, ChevronLeft, ChevronRight, Compass, CheckCircle } from 'lucide-react';

/* ─────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────── */
const TOOLTIP_W = 310;
const PAD = 20;           // gap between spotlight edge and tooltip
const SPOTLIGHT_PAD = 8;  // extra padding around the target rect
const BORDER_R = 10;      // spotlight corner radius
const TRANSITION = '0.35s cubic-bezier(0.4,0,0.2,1)';

/* ─────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────── */
function getRect(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    x: r.left - SPOTLIGHT_PAD,
    y: r.top - SPOTLIGHT_PAD,
    w: r.width + SPOTLIGHT_PAD * 2,
    h: r.height + SPOTLIGHT_PAD * 2,
  };
}

function getTooltipStyle(spot, viewW, viewH) {
  const cardW = Math.min(TOOLTIP_W, Math.max(280, viewW - 24));

  // Mobile layout (< 640px)
  if (viewW < 640) {
    const cardH = 260;
    let top = viewH - cardH - 16;
    if (spot) {
      if (spot.y + spot.h + cardH + 16 < viewH) {
        top = spot.y + spot.h + 12;
      } else if (spot.y - cardH - 12 > 0) {
        top = spot.y - cardH - 12;
      }
    }
    const left = Math.max(12, Math.round((viewW - cardW) / 2));
    return { top: Math.max(12, top), left };
  }

  if (!spot) {
    return { top: viewH / 2 - 140, left: viewW / 2 - cardW / 2 };
  }

  const spRight = spot.x + spot.w;
  const spBottom = spot.y + spot.h;
  const spCenterY = spot.y + spot.h / 2;

  // Prefer right of spotlight
  if (spRight + PAD + cardW < viewW) {
    return {
      left: spRight + PAD,
      top: Math.max(PAD, Math.min(spCenterY - 100, viewH - 240)),
    };
  }
  // Try left
  if (spot.x - PAD - cardW > 0) {
    return {
      left: spot.x - PAD - cardW,
      top: Math.max(PAD, Math.min(spCenterY - 100, viewH - 240)),
    };
  }
  // Below
  if (spBottom + PAD + 220 < viewH) {
    return {
      top: spBottom + PAD,
      left: Math.max(PAD, Math.min(spot.x, viewW - cardW - PAD)),
    };
  }
  // Above
  return {
    top: Math.max(PAD, spot.y - PAD - 220),
    left: Math.max(PAD, Math.min(spot.x, viewW - cardW - PAD)),
  };
}

/* ─────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────── */
export default function AppTour() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const [spot, setSpot] = useState(null);         // { x, y, w, h }
  const [tooltipPos, setTooltipPos] = useState({ top: 80, left: 260 });
  const [tourOpen, setTourOpen] = useState(false);
  const [viewSize, setViewSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const rafRef = useRef(null);

  // Open tour when onboarding becomes visible for first time
  useEffect(() => {
    if (isVisible && !onboardingState?.completed) {
      setTourOpen(true);
    } else if (!isVisible) {
      setTourOpen(false);
    }
  }, [isVisible, onboardingState?.completed]);

  // Navigate to current step's page when step changes
  useEffect(() => {
    if (!tourOpen || !currentStep) return;
    if (location.pathname !== currentStep.path) {
      navigate(currentStep.path);
    }
  }, [tourOpen, currentStep?.id]); // eslint-disable-line

  // Mark step visited when route matches
  useEffect(() => {
    if (!tourOpen || !currentStep) return;
    if (location.pathname === currentStep.path) {
      markStepVisited(currentStep.id);
    }
  }, [location.pathname, tourOpen, currentStep?.id]); // eslint-disable-line

  // Measure target element
  const measure = useCallback((retry = 0) => {
    if (!tourOpen || !currentStep) return;
    const el = document.querySelector(`[data-tour="${currentStep.id}"]`);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setViewSize({ w: vw, h: vh });

    if (!el && retry < 5) {
      setTimeout(() => measure(retry + 1), 200);
      return;
    }

    const rect = getRect(el);
    setSpot(rect);
    setTooltipPos(getTooltipStyle(rect, vw, vh));
  }, [tourOpen, currentStep?.id]); // eslint-disable-line

  useEffect(() => {
    if (!tourOpen) return;
    // delay to let route render
    const t = setTimeout(() => {
      measure();
    }, 380);

    const onResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [tourOpen, currentStep?.id, location.pathname, measure]); // eslint-disable-line

  // Keyboard
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
  const visitedCount = onboardingState?.visitedSteps?.length || 0;
  const progress = (visitedCount / totalSteps) * 100;

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

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9990, pointerEvents: 'none' }}
      aria-hidden="false"
    >
      {/* ── SVG Overlay with spotlight cutout ── */}
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
            {/* White = show the dark overlay */}
            <rect x="0" y="0" width={vw} height={vh} fill="white" />
            {/* Black = cut out (spotlight) */}
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

        {/* Dark backdrop with hole */}
        <rect
          x="0" y="0"
          width={vw} height={vh}
          fill="rgba(10, 18, 30, 0.82)"
          mask="url(#pe-spotlight-mask)"
        />

        {/* Green glow border around spotlight */}
        {spot && (
          <>
            {/* Outer glow */}
            <rect
              x={spot.x - 3}
              y={spot.y - 3}
              width={spot.w + 6}
              height={spot.h + 6}
              rx={BORDER_R + 2}
              ry={BORDER_R + 2}
              fill="none"
              stroke="rgba(34, 197, 94, 0.35)"
              strokeWidth="8"
              style={{ filter: 'blur(4px)', transition: `x ${TRANSITION}, y ${TRANSITION}, width ${TRANSITION}, height ${TRANSITION}` }}
            />
            {/* Sharp green border */}
            <rect
              x={spot.x}
              y={spot.y}
              width={spot.w}
              height={spot.h}
              rx={BORDER_R}
              ry={BORDER_R}
              fill="none"
              stroke="#22C55E"
              strokeWidth="2.5"
              strokeDasharray="6 3"
              style={{ transition: `x ${TRANSITION}, y ${TRANSITION}, width ${TRANSITION}, height ${TRANSITION}` }}
            />
          </>
        )}
      </svg>

      {/* ── Tooltip card ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Onboarding Step ${currentStep.stepNumber} of ${totalSteps}: ${currentStep.title}`}
        style={{
          position: 'absolute',
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: Math.min(TOOLTIP_W, Math.max(280, viewSize.w - 24)),
          maxWidth: 'calc(100vw - 24px)',
          pointerEvents: 'all',
          zIndex: 9999,
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 20px 50px -10px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          transition: `top ${TRANSITION}, left ${TRANSITION}`,
        }}
      >
        {/* ── Header (Municipal Green Theme) ── */}
        <div style={{
          background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
          padding: '1rem 1.15rem 0.9rem',
          position: 'relative',
        }}>
          {/* Step badge row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '800', color: '#166534',
                boxShadow: '0 0 0 3px rgba(220,252,231,0.3)',
                flexShrink: 0,
              }}>
                {currentStep.stepNumber}
              </div>
              <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#DCFCE7', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Step {currentStep.stepNumber} of {totalSteps}
              </span>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close tour"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            >
              <X size={15} />
            </button>
          </div>

          <h3 style={{ margin: '0 0 2px', fontSize: '16.5px', fontWeight: '800', color: '#FFFFFF', lineHeight: 1.25 }}>
            {currentStep.title}
          </h3>
          <div style={{ fontSize: '12px', color: 'rgba(220,252,231,0.9)', fontWeight: '500' }}>
            {currentStep.subtitle}
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ height: '4px', backgroundColor: '#14532D', position: 'relative' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #4ADE80, #22C55E)',
            transition: `width ${TRANSITION}`,
            boxShadow: '0 0 8px rgba(74,222,128,0.6)',
          }} />
        </div>

        {/* ── Contents Body (Crisp Clean White) ── */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '1.1rem 1.15rem 0.9rem' }}>
          <p style={{ margin: '0 0 1.1rem', fontSize: '13.5px', color: '#334155', lineHeight: 1.6, fontWeight: 400 }}>
            {currentStep.description}
          </p>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: '5px', marginBottom: '1.1rem' }} aria-hidden="true">
            {steps.map((s, i) => {
              const visited = onboardingState?.visitedSteps?.includes(s.id);
              const isCur = s.id === currentStep.id;
              return (
                <div key={s.id} style={{
                  height: '4px',
                  width: isCur ? '22px' : '8px',
                  borderRadius: '2px',
                  backgroundColor: visited ? '#15803D' : isCur ? '#22C55E' : '#E2E8F0',
                  transition: `width ${TRANSITION}, background-color ${TRANSITION}`,
                  flexShrink: 0,
                }} />
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <button
              onClick={() => { dismiss(); setTourOpen(false); }}
              style={{
                background: 'none', border: 'none',
                color: '#64748B',
                fontSize: '12px', fontWeight: '500', cursor: 'pointer', padding: '0.25rem 0',
                textDecoration: 'underline', textUnderlineOffset: '2px',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#0F172A'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
            >
              Skip tour
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {currentIdx > 0 && (
                <button
                  onClick={handlePrev}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '3px',
                    backgroundColor: '#F8FAFC',
                    color: '#475569', border: '1px solid #E2E8F0',
                    borderRadius: '8px', padding: '0.45rem 0.75rem',
                    fontSize: '12.5px', fontWeight: '600', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.color = '#475569'; }}
                >
                  <ChevronLeft size={13} /> Back
                </button>
              )}

              <button
                onClick={handleNext}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
                  color: '#FFFFFF',
                  border: 'none', borderRadius: '8px',
                  padding: '0.45rem 0.95rem',
                  fontSize: '12.5px', fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(21, 128, 61, 0.35)',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(21, 128, 61, 0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(21, 128, 61, 0.35)'; }}
              >
                {isLast
                  ? <><CheckCircle size={13} /> Finish</>
                  : <>{currentStep.nextLabel.replace(' →', '')} <ChevronRight size={13} /></>
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
