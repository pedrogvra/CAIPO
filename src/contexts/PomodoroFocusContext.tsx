'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

interface PomodoroFocusContextValue {
  registerFocusGuard: (onLeaveFocus: () => void) => () => void;
  requestNavigation: (onNavigate: () => void) => void;
}

const PomodoroFocusContext = createContext<PomodoroFocusContextValue | null>(null);

export function PomodoroFocusProvider({ children }: { children: React.ReactNode }) {
  const onLeaveFocusRef = useRef<(() => void) | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const registerFocusGuard = useCallback((onLeaveFocus: () => void) => {
    onLeaveFocusRef.current = onLeaveFocus;
    return () => {
      if (onLeaveFocusRef.current === onLeaveFocus) onLeaveFocusRef.current = null;
    };
  }, []);

  const requestNavigation = useCallback((onNavigate: () => void) => {
    if (!onLeaveFocusRef.current) {
      onNavigate();
      return;
    }
    setPendingNavigation(() => onNavigate);
  }, []);

  const cancelNavigation = () => setPendingNavigation(null);

  const confirmNavigation = () => {
    const onLeaveFocus = onLeaveFocusRef.current;
    const onNavigate = pendingNavigation;
    setPendingNavigation(null);
    onLeaveFocus?.();
    onLeaveFocusRef.current = null;
    onNavigate?.();
  };

  return (
    <PomodoroFocusContext.Provider value={{ registerFocusGuard, requestNavigation }}>
      {children}
      {pendingNavigation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pomodoro-exit-title"
          aria-describedby="pomodoro-exit-description"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(0,0,0,0.7)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              padding: 32,
              borderRadius: 25,
              background: 'linear-gradient(156deg, #1E55A8 0%, #091541 100%)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              color: 'white',
              fontFamily: 'Poppins',
            }}
          >
            <h2 id="pomodoro-exit-title" style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 600 }}>
              Deseja sair do Pomodoro?
            </h2>
            <p id="pomodoro-exit-description" style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 600, lineHeight: '24px' }}>
              Você perderá o foco e a sessão será reiniciada.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={cancelNavigation}
                style={{
                  flex: 1,
                  minHeight: 52,
                  padding: '12px',
                  borderRadius: 10,
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'transparent',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins',
                }}
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={confirmNavigation}
                style={{
                  flex: 1,
                  minHeight: 52,
                  padding: '12px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#f87171',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins',
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </PomodoroFocusContext.Provider>
  );
}

export function usePomodoroFocus() {
  const context = useContext(PomodoroFocusContext);
  if (!context) throw new Error('usePomodoroFocus must be used within PomodoroFocusProvider');
  return context;
}
