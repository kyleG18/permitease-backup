import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProductOnboarding, ONBOARDING_STEPS } from '../context/ProductOnboardingContext';
import { X, ChevronRight, CheckCircle, Compass } from 'lucide-react';

/**
 * ProductOnboardingBanner
 *
 * A persistent top-of-page banner that appears on every onboarding step page.
 * - Tells the user which step they are on
 * - Shows overall progress (visited vs total)
 * - Has a "Next Step" button that navigates AND advances the step counter
 * - Auto-marks the current step visited when the user lands on its page
 * - Dismissable (hides until re-opened via sidebar)
 */
export default function ProductOnboardingBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isVisible,
    currentStep,
    onboardingState,
    markStepVisited,
    nextStep,
    dismiss,
    complete,
    totalSteps,
    progressPercent,
    ONBOARDING_STEPS: steps,
  } = useProductOnboarding();

  // Auto-mark current step visited when landing on its route
  useEffect(() => {
    if (!onboardingState || onboardingState.completed) return;
    const match = steps.find(s => s.path === location.pathname);
    if (match) markStepVisited(match.id);
  }, [location.pathname, onboardingState, steps, markStepVisited]);

  if (!isVisible || !currentStep) return null;

  const currentIdx = steps.findIndex(s => s.id === currentStep.id);
  const isLastStep = currentIdx >= steps.length - 1;
  const isOnCurrentStepPage = location.pathname === currentStep.path;
  const visitedCount = onboardingState?.visitedSteps?.length || 0;

  const handleNext = () => {
    if (isLastStep) {
      complete();
    } else {
      const nextStepDef = steps[currentIdx + 1];
      nextStep();              // advance context state
      navigate(nextStepDef.path); // navigate to next page
    }
  };

  const handleGoToCurrentStep = () => {
    navigate(currentStep.path);
  };

  return (
    <div
      role="complementary"
      aria-label={`Onboarding step ${currentStep.stepNumber} of ${totalSteps}`}
      style={{
        backgroundColor: '#0F172A',
        color: 'white',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        fontFamily: 'Inter, -apple-system, sans-serif',
        position: 'relative',
        zIndex: 20,
        flexShrink: 0,
      }}
    >
      {/* Progress bar at very top */}
      <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: '#22C55E',
            transition: 'width 0.4s ease',
          }}
          aria-hidden="true"
        />
      </div>

      <div className="onboarding-banner-container" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.625rem 1.5rem',
        flexWrap: 'wrap',
      }}>
        {/* Step badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexShrink: 0,
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#22C55E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '800',
            color: '#0F172A',
            flexShrink: 0,
          }}>
            {currentStep.stepNumber}
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#86EFAC',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
          }}>
            Step {currentStep.stepNumber} of {totalSteps}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.15)', flexShrink: 0 }} aria-hidden="true" />

        {/* Step title & description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontWeight: '700', fontSize: '14px', color: 'white', whiteSpace: 'nowrap' }}>
              {currentStep.title}
            </span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              — {currentStep.subtitle}
            </span>
          </div>
          {isOnCurrentStepPage && (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '1px', lineHeight: 1.4 }}>
              {currentStep.description}
            </div>
          )}
        </div>

        {/* Step dots (desktop only) */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
          aria-hidden="true"
          className="onboarding-dots"
        >
          {steps.map((s, i) => {
            const visited = onboardingState?.visitedSteps?.includes(s.id);
            const isCurrent = s.id === currentStep.id;
            return (
              <div
                key={s.id}
                title={`Step ${i + 1}: ${s.title}`}
                style={{
                  width: isCurrent ? '20px' : '7px',
                  height: '7px',
                  borderRadius: '4px',
                  backgroundColor: visited ? '#22C55E' : isCurrent ? '#86EFAC' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              />
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {/* Go to step button (only when user is NOT on this step's page) */}
          {!isOnCurrentStepPage && (
            <button
              onClick={handleGoToCurrentStep}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                padding: '0.35rem 0.75rem',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Compass size={13} />
              {currentStep.action}
            </button>
          )}

          {/* Next step button */}
          <button
            onClick={handleNext}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              backgroundColor: '#22C55E',
              color: '#0F172A',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.85rem',
              fontSize: '12.5px',
              fontWeight: '800',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isLastStep ? (
              <><CheckCircle size={13} /> Finish Onboarding</>
            ) : (
              <>{currentStep.nextLabel} <ChevronRight size={13} /></>
            )}
          </button>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            aria-label="Dismiss onboarding guide"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
