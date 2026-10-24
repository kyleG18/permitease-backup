import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { BusinessContext } from './BusinessContext';

export const ProductOnboardingContext = createContext();

// The 8-step guided onboarding flow (matches sidebar order)
export const ONBOARDING_STEPS = [
  {
    id: 'dashboard',
    path: '/dashboard',
    stepNumber: 1,
    title: 'Dashboard',
    subtitle: 'Your command centre',
    description: 'This is your home base. See your permit status, upcoming deadlines, and preparation progress — all in one place.',
    action: 'Explore your Dashboard',
    nextLabel: 'Next: My Business →',
  },
  {
    id: 'my-business',
    path: '/profile',
    stepNumber: 2,
    title: 'My Business',
    subtitle: 'Set up your business profile',
    description: 'Make sure your business details are complete and up to date. PermitEase uses this data to generate your personalised permit requirements.',
    action: 'Review your Business Profile',
    nextLabel: 'Next: AI Assessment →',
  },
  {
    id: 'ai-assessment',
    path: '/assessment',
    stepNumber: 3,
    title: 'AI Permit Assessment',
    subtitle: 'Find out which permits you need',
    description: 'Run the AI assessment to instantly identify which permits, clearances, and national registrations your business requires. No guessing needed.',
    action: 'Run your AI Assessment',
    nextLabel: 'Next: Tax Estimation →',
  },
  {
    id: 'tax-estimation',
    path: '/tax-estimation',
    stepNumber: 4,
    title: 'Tax Estimation',
    subtitle: 'Estimate your national taxes',
    description: 'Get a planning estimate for your BIR taxes (8% flat, VAT, or Corporate) before you visit the Municipal Treasurer\'s Office. Includes bilingual disclaimers.',
    action: 'Estimate your taxes',
    nextLabel: 'Next: Fee Estimation →',
  },
  {
    id: 'fee-estimation',
    path: '/fee-estimation',
    stepNumber: 5,
    title: 'Fee Estimation',
    subtitle: 'Budget your LGU regulatory fees',
    description: "See indicative fees for your Mayor's Permit, Sanitary Permit, Zoning, Fire Safety, and more. Plan your budget before permit day.",
    action: 'Estimate your fees',
    nextLabel: 'Next: Permit Readiness →',
  },
  {
    id: 'permit-readiness',
    path: '/readiness',
    stepNumber: 6,
    title: 'Permit Readiness',
    subtitle: 'Build your document checklist',
    description: 'Your personalised checklist of every document you need to bring to the BPLO. Mark items as ready as you prepare them.',
    action: 'Check your Permit Readiness',
    nextLabel: 'Next: My Applications →',
  },
  {
    id: 'my-applications',
    path: '/applications',
    stepNumber: 7,
    title: 'My Applications',
    subtitle: 'Track your permit preparation',
    description: 'Submit and track your permit preparation here. Download the official Roxas Unified Business Permit Application Form pre-filled with your business data.',
    action: 'Go to My Applications',
    nextLabel: 'Next: My Permits →',
  },
  {
    id: 'my-permits',
    path: '/permits',
    stepNumber: 8,
    title: 'My Permits',
    subtitle: 'Monitor your verified permits',
    description: 'Once the BPLO verifies your preparation, your permits appear here. Monitor validity and expiry dates to stay compliant year-round.',
    action: 'View My Permits',
    nextLabel: 'Finish Onboarding ✓',
  },
];

const STORAGE_KEY_PREFIX = 'permitease_onboarding_v2_';

function getStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function loadState(userId) {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveState(userId, state) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch {}
}

export function ProductOnboardingProvider({ children }) {
  const { user } = useContext(AuthContext);
  const { isOnboarded } = useContext(BusinessContext);
  const userId = user?.id || user?._id;

  // null = not yet loaded, object = loaded state
  const [onboardingState, setOnboardingState] = useState(null);

  // Load from localStorage when user changes or check URL param
  useEffect(() => {
    if (!userId || user?.role !== 'business_owner') {
      setOnboardingState(null);
      return;
    }
    if (!isOnboarded) {
      setOnboardingState(null);
      return;
    }

    // Check if URL specifically requests starting or restarting the tour
    const search = window.location.search || '';
    const forceTour = search.includes('tour=true') || search.includes('tour=start') || search.includes('onboarding=true');

    if (forceTour) {
      const fresh = {
        active: true,
        currentStepId: ONBOARDING_STEPS[0].id,
        visitedSteps: [],
        completed: false,
        dismissedAt: null,
      };
      setOnboardingState(fresh);
      saveState(userId, fresh);
      return;
    }

    const saved = loadState(userId);
    if (saved) {
      setOnboardingState(saved);
    } else {
      // First time — initialise fresh state, auto-start
      const fresh = {
        active: true,
        currentStepId: ONBOARDING_STEPS[0].id,
        visitedSteps: [],
        completed: false,
        dismissedAt: null,
      };
      setOnboardingState(fresh);
      saveState(userId, fresh);
    }
  }, [userId, isOnboarded, user?.role]);

  const persist = useCallback((nextState) => {
    setOnboardingState(nextState);
    if (userId) saveState(userId, nextState);
  }, [userId]);

  // Mark a step as visited when the user lands on that page
  const markStepVisited = useCallback((stepId) => {
    setOnboardingState(prev => {
      if (!prev || prev.completed) return prev;
      if (prev.visitedSteps.includes(stepId)) return prev;
      const visited = [...prev.visitedSteps, stepId];
      const next = { ...prev, visitedSteps: visited };
      if (userId) saveState(userId, next);
      return next;
    });
  }, [userId]);

  // Advance to a specific step
  const goToStep = useCallback((stepId) => {
    setOnboardingState(prev => {
      if (!prev || prev.completed) return prev;
      const next = { ...prev, currentStepId: stepId, active: true };
      if (userId) saveState(userId, next);
      return next;
    });
  }, [userId]);

  // Move forward one step
  const nextStep = useCallback(() => {
    setOnboardingState(prev => {
      if (!prev) return prev;
      const idx = ONBOARDING_STEPS.findIndex(s => s.id === prev.currentStepId);
      if (idx >= ONBOARDING_STEPS.length - 1) {
        // Finish
        const next = { ...prev, completed: true, active: false };
        if (userId) saveState(userId, next);
        return next;
      }
      const nextId = ONBOARDING_STEPS[idx + 1].id;
      const next = { ...prev, currentStepId: nextId };
      if (userId) saveState(userId, next);
      return next;
    });
  }, [userId]);

  // Move back one step
  const prevStep = useCallback(() => {
    setOnboardingState(prev => {
      if (!prev) return prev;
      const idx = ONBOARDING_STEPS.findIndex(s => s.id === prev.currentStepId);
      if (idx <= 0) return prev;
      const prevId = ONBOARDING_STEPS[idx - 1].id;
      const next = { ...prev, currentStepId: prevId };
      if (userId) saveState(userId, next);
      return next;
    });
  }, [userId]);

  // Dismiss temporarily (show again next session if not complete)
  const dismiss = useCallback(() => {
    setOnboardingState(prev => {
      if (!prev) return prev;
      const next = { ...prev, active: false, dismissedAt: new Date().toISOString() };
      if (userId) saveState(userId, next);
      return next;
    });
  }, [userId]);

  // Complete & permanently hide
  const complete = useCallback(() => {
    setOnboardingState(prev => {
      if (!prev) return prev;
      const next = { ...prev, completed: true, active: false };
      if (userId) saveState(userId, next);
      return next;
    });
  }, [userId]);

  // Re-open the banner (from sidebar button)
  const reopen = useCallback(() => {
    setOnboardingState(prev => {
      if (!prev || prev.completed) return prev;
      const next = { ...prev, active: true };
      if (userId) saveState(userId, next);
      return next;
    });
  }, [userId]);

  // Reset (for testing / sidebar button when completed)
  const reset = useCallback(() => {
    if (!userId) return;
    const fresh = {
      active: true,
      currentStepId: ONBOARDING_STEPS[0].id,
      visitedSteps: [],
      completed: false,
      dismissedAt: null,
    };
    persist(fresh);
  }, [userId, persist]);

  const currentStep = onboardingState
    ? ONBOARDING_STEPS.find(s => s.id === onboardingState.currentStepId) || ONBOARDING_STEPS[0]
    : null;

  const isVisible = Boolean(
    onboardingState &&
    onboardingState.active &&
    !onboardingState.completed &&
    user?.role === 'business_owner' &&
    isOnboarded
  );

  const progressPercent = onboardingState
    ? Math.round((onboardingState.visitedSteps.length / ONBOARDING_STEPS.length) * 100)
    : 0;

  return (
    <ProductOnboardingContext.Provider value={{
      onboardingState,
      currentStep,
      isVisible,
      progressPercent,
      markStepVisited,
      goToStep,
      nextStep,
      prevStep,
      dismiss,
      complete,
      reopen,
      reset,
      totalSteps: ONBOARDING_STEPS.length,
      ONBOARDING_STEPS,
    }}>
      {children}
    </ProductOnboardingContext.Provider>
  );
}

export function useProductOnboarding() {
  return useContext(ProductOnboardingContext);
}
